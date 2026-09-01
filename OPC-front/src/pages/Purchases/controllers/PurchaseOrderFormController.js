import { signal, computed } from '@preact/signals-react';
import { Controller } from '@/lib/Controller';
import { AuthStore } from '@/stores/AuthStore';
import { BranchDirectoryStore } from '@/stores/BranchDirectoryStore';
import { UiStore } from '@/stores/UiStore';
import { toNumber, backendError } from '@/lib/format';
import { PurchaseService } from '../services/PurchaseService';

const EMPTY_ITEM = { productId: '', quantity: '', unitPrice: '', discountPercentage: '' };

/** Formulario de orden de compra (modal sobre el listado): alta y edición de borrador. */
export class PurchaseOrderFormController extends Controller {
  constructor(parent) {
    super();
    this.parent = parent;
  }

  suppliers = signal([]);
  products = signal([]);

  editingId = signal(null);
  supplierId = signal('');
  branchId = signal('');
  paymentTerms = signal('');
  items = signal([{ ...EMPTY_ITEM }]);

  visible = signal(false);
  loading = signal(true);
  submitting = signal(false);
  #loaded = false;

  availableBranches = computed(() => {
    const own = AuthStore.branches.value;
    const all = BranchDirectoryStore.all.value;
    return Array.isArray(own) ? all.filter((branch) => own.includes(branch.id)) : all;
  });

  lineSubtotals = computed(() =>
    this.items.value.map(
      (item) => toNumber(item.quantity) * toNumber(item.unitPrice) - this.#lineDiscountAmount(item),
    ),
  );

  totals = computed(() => {
    const items = this.items.value;
    const subtotal = items.reduce((sum, item) => sum + toNumber(item.quantity) * toNumber(item.unitPrice), 0);
    const totalDiscount = items.reduce((sum, item) => sum + this.#lineDiscountAmount(item), 0);
    return { subtotal, totalDiscount, total: subtotal - totalDiscount };
  });

  // Monto de descuento de una línea a partir de su porcentaje.
  #lineDiscountAmount(item) {
    const gross = toNumber(item.quantity) * toNumber(item.unitPrice);
    return (gross * toNumber(item.discountPercentage)) / 100;
  }

  openCreate = () => {
    this.#resetToBlank();
    this.visible.value = true;
    this.#ensureReferenceData();
  };

  openEdit = (order) => {
    this.editingId.value = order.id;
    this.supplierId.value = order.supplierId ?? '';
    this.branchId.value = order.branchId ?? '';
    this.paymentTerms.value = order.paymentTerms ?? '';
    // El backend devuelve los montos como DECIMAL ("10.0000"); se normalizan
    // a número para que los campos no muestren ceros de más.
    this.items.value = (order.items ?? []).map((item) => ({
      productId: String(item.productId),
      quantity: String(Number(item.quantity)),
      unitPrice: String(Number(item.unitPrice)),
      discountPercentage: String(Number(item.discountPercentage ?? 0)),
    }));
    if (this.items.value.length === 0) this.items.value = [{ ...EMPTY_ITEM }];
    this.visible.value = true;
    this.#ensureReferenceData();
  };

  close = () => {
    this.visible.value = false;
  };

  #resetToBlank() {
    this.editingId.value = null;
    this.supplierId.value = '';
    this.branchId.value = '';
    this.paymentTerms.value = '';
    this.items.value = [{ ...EMPTY_ITEM }];
  }

  #ensureReferenceData() {
    if (this.#loaded) {
      this.#applyDefaults();
      return;
    }
    this.#loaded = true;
    this.#load();
  }

  async #load() {
    if (!AuthStore.branches.value) await AuthStore.loadProfile();
    await BranchDirectoryStore.ensureLoaded();
    try {
      const [suppliers, products] = await Promise.all([
        PurchaseService.suppliers(),
        PurchaseService.productCatalog(),
      ]);
      this.suppliers.value = suppliers.filter((supplier) => supplier.active);
      this.products.value = products;
      this.#applyDefaults();
    } catch {
      UiStore.fail('No se pudo cargar la información necesaria para la orden de compra.');
    } finally {
      this.loading.value = false;
    }
  }

  // Preselecciona proveedor y sucursal solo cuando el formulario es de alta.
  #applyDefaults() {
    if (this.editingId.value) return;
    this.supplierId.value = this.supplierId.value || this.suppliers.value[0]?.id || '';
    this.branchId.value = this.branchId.value || this.availableBranches.value[0]?.id || '';
  }

  setSupplierId = (value) => {
    this.supplierId.value = value;
  };

  setBranchId = (value) => {
    this.branchId.value = value;
  };

  setPaymentTerms = (value) => {
    this.paymentTerms.value = value;
  };

  updateItem = (index, field, value) => {
    this.items.value = this.items.value.map((item, i) =>
      i === index ? { ...item, [field]: value } : item,
    );
  };

  addItem = () => {
    this.items.value = [...this.items.value, { ...EMPTY_ITEM }];
  };

  removeItem = (index) => {
    this.items.value = this.items.value.filter((_, i) => i !== index);
  };

  async submit(event) {
    event.preventDefault();
    UiStore.clear();

    const valid = this.items.value.every(
      (item) =>
        item.productId &&
        toNumber(item.quantity) > 0 &&
        toNumber(item.unitPrice) >= 0 &&
        toNumber(item.discountPercentage) >= 0 &&
        toNumber(item.discountPercentage) <= 100,
    );
    if (!valid) {
      UiStore.fail(
        'Cada ítem necesita producto, cantidad positiva, precio unitario válido y un descuento entre 0 y 100 %.',
      );
      return;
    }

    const payload = {
      supplierId: Number(this.supplierId.value),
      branchId: Number(this.branchId.value),
      paymentTerms: this.paymentTerms.value || null,
      items: this.items.value.map((item) => ({
        productId: Number(item.productId),
        quantity: toNumber(item.quantity),
        unitPrice: toNumber(item.unitPrice),
        discountPercentage: toNumber(item.discountPercentage),
      })),
    };

    this.submitting.value = true;
    try {
      if (this.editingId.value) {
        const order = await PurchaseService.update(this.editingId.value, payload);
        UiStore.notify(`Orden de compra ${order.orderNumber ?? ''} actualizada correctamente.`.trim());
      } else {
        const order = await PurchaseService.create(payload);
        UiStore.notify(`Orden de compra ${order.orderNumber ?? ''} creada correctamente.`.trim());
      }
      this.#resetToBlank();
      this.close();
      await this.parent.load();
    } catch (error) {
      UiStore.fail(backendError(error, 'No se pudo guardar la orden de compra.'));
    } finally {
      this.submitting.value = false;
    }
  }
}
