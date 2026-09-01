import { signal, computed } from '@preact/signals-react';
import { Controller } from '@/lib/Controller';
import { AuthStore } from '@/stores/AuthStore';
import { BranchDirectoryStore } from '@/stores/BranchDirectoryStore';
import { UiStore } from '@/stores/UiStore';
import { toNumber, isCurrentlyValid, backendError } from '@/lib/format';
import { SaleService } from '../services/SaleService';

const EMPTY_ITEM = { productId: '', unitId: '', quantity: '', discountPct: '' };

/**
 * Formulario de registro de venta: sucursal + lista de precios vigente +
 * cliente (opcional) + ítems con descuento por línea. Muestra stock
 * disponible y precio de la lista en vivo por cada línea.
 */
export class SaleFormController extends Controller {
  constructor(parent) {
    super();
    this.parent = parent;
  }

  products = signal([]);
  priceLists = signal([]); // solo las vigentes
  customers = signal([]);
  inventoryByProductId = signal({});
  // { [productId]: ProductUnitResponse[] } — se llena al elegir un producto.
  unitsByProductId = signal({});

  branchId = signal('');
  priceListId = signal('');
  customerId = signal('');
  items = signal([{ ...EMPTY_ITEM }]);

  visible = signal(false);
  loading = signal(true);
  submitting = signal(false);
  #loaded = false;

  isAdmin = computed(() => AuthStore.role.value === 'GENERAL_ADMIN');

  availableBranches = computed(() => {
    const own = AuthStore.branches.value;
    const all = BranchDirectoryStore.all.value;
    return Array.isArray(own) ? all.filter((branch) => own.includes(branch.id)) : all;
  });

  selectedPriceList = computed(() =>
    this.priceLists.value.find((list) => list.id === Number(this.priceListId.value)),
  );

  priceByProductId = computed(() =>
    Object.fromEntries((this.selectedPriceList.value?.items ?? []).map((item) => [item.productId, item.price])),
  );

  lineDetails = computed(() =>
    this.items.value.map((item) => {
      const productId = Number(item.productId);
      const listPrice = this.priceByProductId.value[productId];
      const factor = this.#factorFor(item);
      const hasPrice = listPrice !== undefined;
      // El precio de la lista es por unidad base; si se vende en una unidad
      // mayor (caja), el precio de la línea es precio_base * factor.
      const unitPrice = hasPrice ? listPrice * factor : undefined;
      const quantity = toNumber(item.quantity);
      const discountPct = toNumber(item.discountPct);
      const gross = hasPrice ? quantity * unitPrice : 0;
      return {
        unitPrice,
        hasPrice,
        baseQuantity: quantity * factor,
        subtotal: gross - (gross * discountPct) / 100,
        availableStock: this.inventoryByProductId.value[productId],
      };
    }),
  );

  // ¿Alguna línea pide más unidades (en unidad base) de las que hay en stock?
  // El backend igual lo rechaza, pero esto evita siquiera intentar confirmar.
  hasStockShortage = computed(() =>
    this.items.value.some((item, index) => {
      const detail = this.lineDetails.value[index];
      return detail?.availableStock !== undefined && detail.baseQuantity > Number(detail.availableStock);
    }),
  );

  // Factor de conversión a unidad base de una línea (1 = unidad base).
  #factorFor(item) {
    if (!item.unitId) return 1;
    const unit = (this.unitsByProductId.value[item.productId] ?? []).find(
      (candidate) => String(candidate.unitId) === String(item.unitId),
    );
    return unit ? Number(unit.conversionFactor) : 1;
  }

  // Opciones de unidad de una línea: unidad base + unidades marcadas de venta.
  unitOptionsFor(item) {
    const product = this.products.value.find((candidate) => String(candidate.id) === String(item.productId));
    if (!product) return [];
    const base = { value: '', label: `${product.baseUnitAbbreviation} (unidad base)` };
    const alternatives = (this.unitsByProductId.value[product.id] ?? [])
      .filter((unit) => unit.isSaleUnit)
      .map((unit) => ({
        value: String(unit.unitId),
        label: `${unit.unitAbbreviation} (× ${Number(unit.conversionFactor)})`,
      }));
    return [base, ...alternatives];
  }

  baseEquivalentFor(item) {
    if (!item.unitId) return null;
    return toNumber(item.quantity) * this.#factorFor(item);
  }

  async #loadUnitsFor(productId) {
    if (!productId || this.unitsByProductId.value[productId]) return;
    try {
      const units = await SaleService.productUnits(productId);
      this.unitsByProductId.value = { ...this.unitsByProductId.value, [productId]: units };
    } catch {
      this.unitsByProductId.value = { ...this.unitsByProductId.value, [productId]: [] };
    }
  }

  totals = computed(() => {
    const details = this.lineDetails.value;
    const subtotal = this.items.value.reduce(
      (sum, item, i) => sum + toNumber(item.quantity) * (details[i].unitPrice ?? 0),
      0,
    );
    const totalDiscount = this.items.value.reduce((sum, item, i) => {
      const gross = toNumber(item.quantity) * (details[i].unitPrice ?? 0);
      return sum + (gross * toNumber(item.discountPct)) / 100;
    }, 0);
    return { subtotal, totalDiscount, total: subtotal - totalDiscount };
  });

  open = () => {
    this.visible.value = true;
    if (!this.#loaded) {
      this.#loaded = true;
      this.#load();
    }
  };

  close = () => {
    this.visible.value = false;
  };

  async #load() {
    // Las sucursales propias del usuario se cargan async tras el login; sin
    // esto `availableBranches` arrancaría con todas y luego se recortaría.
    if (!AuthStore.branches.value) await AuthStore.loadProfile();
    await BranchDirectoryStore.ensureLoaded();
    try {
      const [products, priceLists, customers] = await Promise.all([
        SaleService.productCatalog(),
        SaleService.priceLists(),
        SaleService.customers(),
      ]);
      this.products.value = products;
      this.priceLists.value = priceLists.filter(isCurrentlyValid);
      this.customers.value = customers.filter((customer) => customer.active);
      this.branchId.value = this.branchId.value || this.availableBranches.value[0]?.id || '';
      this.priceListId.value = this.priceListId.value || this.priceLists.value[0]?.id || '';
      if (this.branchId.value) await this.loadInventory();
    } catch {
      UiStore.fail('No se pudo cargar la información necesaria para registrar la venta.');
    } finally {
      this.loading.value = false;
    }
  }

  async loadInventory() {
    const branchId = this.branchId.value;
    if (!branchId) return;
    try {
      const data = await SaleService.branchInventory(branchId);
      this.inventoryByProductId.value = Object.fromEntries(
        data.map((entry) => [entry.productId, entry.currentQuantity]),
      );
    } catch {
      UiStore.fail('No se pudo cargar el stock de la sucursal seleccionada.');
    }
  }

  setBranchId = (value) => {
    this.branchId.value = value;
    this.loadInventory();
  };

  setPriceListId = (value) => {
    this.priceListId.value = value;
  };

  setCustomerId = (value) => {
    this.customerId.value = value;
  };

  updateItem = (index, field, value) => {
    this.items.value = this.items.value.map((item, i) => {
      if (i !== index) return item;
      if (field === 'productId') {
        this.#loadUnitsFor(value);
        return { ...item, productId: value, unitId: '' };
      }
      return { ...item, [field]: value };
    });
  };

  addItem = () => {
    this.items.value = [...this.items.value, { ...EMPTY_ITEM }];
  };

  removeItem = (index) => {
    this.items.value = this.items.value.filter((_, i) => i !== index);
  };

  #validate() {
    if (!this.priceListId.value) return 'Selecciona una lista de precios vigente.';
    if (this.hasStockShortage.value) {
      return 'Hay líneas con una cantidad mayor al stock disponible en la sucursal.';
    }
    for (const item of this.items.value) {
      if (!item.productId) return 'Cada ítem necesita un producto seleccionado.';
      const quantity = toNumber(item.quantity);
      if (quantity <= 0 || !Number.isInteger(quantity)) {
        return 'La cantidad debe ser un número entero mayor que cero.';
      }
      if (this.priceByProductId.value[Number(item.productId)] === undefined) {
        const product = this.products.value.find((p) => p.id === Number(item.productId));
        return `El producto ${product?.name ?? item.productId} no tiene precio en la lista seleccionada.`;
      }
    }
    return null;
  }

  async submit(event) {
    event.preventDefault();
    UiStore.clear();

    const validationError = this.#validate();
    if (validationError) {
      UiStore.fail(validationError);
      return;
    }

    this.submitting.value = true;
    try {
      const sale = await SaleService.create({
        branchId: Number(this.branchId.value),
        priceListId: Number(this.priceListId.value),
        customerId: this.customerId.value ? Number(this.customerId.value) : null,
        items: this.items.value.map((item) => ({
          productId: Number(item.productId),
          unitId: item.unitId ? Number(item.unitId) : null,
          quantity: toNumber(item.quantity),
          discountPct: item.discountPct ? toNumber(item.discountPct) : null,
        })),
      });
      UiStore.notify(`Venta ${sale.saleNumber} registrada correctamente. Total: ${sale.total}`);
      this.items.value = [{ ...EMPTY_ITEM }];
      this.customerId.value = '';
      this.close();
      await this.parent.refresh();
    } catch (error) {
      UiStore.fail(backendError(error, 'No se pudo registrar la venta.'));
    } finally {
      this.submitting.value = false;
    }
  }
}
