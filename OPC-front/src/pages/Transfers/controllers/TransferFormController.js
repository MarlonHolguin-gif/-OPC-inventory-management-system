import { signal, computed } from '@preact/signals-react';
import { Controller } from '@/lib/Controller';
import { AuthStore } from '@/stores/AuthStore';
import { BranchDirectoryStore } from '@/stores/BranchDirectoryStore';
import { UiStore } from '@/stores/UiStore';
import { backendError } from '@/lib/format';
import { availableLineProducts, hasDuplicateProducts } from '@/lib/lineItems';
import { TransferService } from '../services/TransferService';

const EMPTY_ITEM = { productId: '', quantity: '' };

/**
 * Formulario de solicitud de transferencia (modal sobre el panel).
 *
 * La escritura la autoriza el backend contra la sucursal DESTINO (o
 * ADMIN_GENERAL sin restricción), por eso el selector de destino se limita a
 * las sucursales propias del usuario y el de origen queda abierto a cualquier
 * otra sucursal activa.
 */
export class TransferFormController extends Controller {
  constructor(parent) {
    super();
    this.parent = parent;
  }

  products = signal([]);
  originBranchId = signal('');
  destinationBranchId = signal('');
  urgency = signal('MEDIUM');
  items = signal([{ ...EMPTY_ITEM }]);
  // { [productId]: currentQuantity } de la sucursal de origen.
  inventoryByProductId = signal({});
  // branchId de origen para el que ya terminó de cargar el inventario. Hasta
  // que coincida con el origen efectivo, no se evalúa el faltante (evita
  // marcar líneas en rojo mientras la petición está en vuelo).
  originInventoryLoadedFor = signal('');

  visible = signal(false);
  loading = signal(true);
  submitting = signal(false);
  #loaded = false;

  activeBranches = computed(() => BranchDirectoryStore.all.value.filter((branch) => branch.active));

  destinationOptions = computed(() => {
    const own = AuthStore.branches.value;
    const active = this.activeBranches.value;
    return Array.isArray(own) ? active.filter((branch) => own.includes(branch.id)) : active;
  });

  originOptions = computed(() =>
    this.activeBranches.value.filter(
      (branch) => String(branch.id) !== String(this.destinationBranchId.value),
    ),
  );

  originBranchIdValue = computed(() => {
    const options = this.originOptions.value;
    return options.some((branch) => String(branch.id) === String(this.originBranchId.value))
      ? this.originBranchId.value
      : (options[0]?.id ?? '');
  });

  // Stock del producto de una línea en la sucursal de origen. undefined solo
  // mientras el inventario del origen todavía no cargó; una vez cargado, un
  // producto sin fila de inventario en el origen son 0 existencias — el
  // inventario es compartido y el backend aplica el mismo criterio.
  lineStock(item) {
    if (!item.productId) return undefined;
    if (String(this.originInventoryLoadedFor.value) !== String(this.originBranchIdValue.value)) {
      return undefined;
    }
    return this.inventoryByProductId.value[Number(item.productId)] ?? 0;
  }

  // ¿Alguna línea pide más de lo que hay en el origen? El backend igual lo
  // rechaza, pero así ni siquiera se intenta.
  hasStockShortage = computed(() =>
    this.items.value.some((item) => {
      const available = this.lineStock(item);
      return available !== undefined && Number(item.quantity) > Number(available);
    }),
  );

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
    if (!AuthStore.branches.value) await AuthStore.loadProfile();
    await BranchDirectoryStore.ensureLoaded();
    try {
      this.products.value = await TransferService.productCatalog();
    } catch {
      UiStore.fail('No se pudo cargar el catálogo de productos.');
    }
    if (!this.destinationBranchId.value) {
      this.destinationBranchId.value = this.destinationOptions.value[0]?.id ?? '';
    }
    this.loading.value = false;
    this.loadOriginInventory();
  }

  async loadOriginInventory() {
    const originId = this.originBranchIdValue.value;
    if (!originId) return;
    this.originInventoryLoadedFor.value = '';
    try {
      const data = await TransferService.branchInventory(originId);
      this.inventoryByProductId.value = Object.fromEntries(
        data.map((entry) => [entry.productId, entry.currentQuantity]),
      );
      this.originInventoryLoadedFor.value = String(originId);
    } catch {
      this.inventoryByProductId.value = {};
    }
  }

  setUrgency = (value) => {
    this.urgency.value = value;
  };

  setDestination = (value) => {
    this.destinationBranchId.value = value;
    // Cambiar el destino puede recalcular el origen efectivo (originOptions
    // excluye el destino) — recargar el stock del origen.
    this.loadOriginInventory();
  };

  setOrigin = (value) => {
    this.originBranchId.value = value;
    this.loadOriginInventory();
  };

  // Catálogo para el selector de una línea sin los productos ya elegidos en
  // otras líneas — un producto va una sola vez por transferencia.
  availableProducts(index) {
    return availableLineProducts(this.products.value, this.items.value, index);
  }

  canAddItem = computed(() => this.items.value.length < this.products.value.length);

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

    const originId = this.originBranchIdValue.value;
    const destinationId = this.destinationBranchId.value;
    const items = this.items.value;

    if (!originId || !destinationId) {
      UiStore.fail('Selecciona sucursal de origen y de destino.');
      return;
    }
    if (!items.every((item) => item.productId && Number(item.quantity) > 0)) {
      UiStore.fail('Cada ítem necesita producto y una cantidad positiva.');
      return;
    }
    if (hasDuplicateProducts(items)) {
      UiStore.fail('Hay un producto repetido en varias líneas. Cada producto va una sola vez por transferencia.');
      return;
    }
    if (this.hasStockShortage.value) {
      UiStore.fail(
        'Hay líneas que piden más de lo que hay en la sucursal de origen. El inventario es compartido: ' +
          'no se puede transferir lo que no existe.',
      );
      return;
    }

    this.submitting.value = true;
    try {
      const transfer = await TransferService.create({
        originBranchId: Number(originId),
        destinationBranchId: Number(destinationId),
        urgency: this.urgency.value,
        items: items.map((item) => ({
          productId: Number(item.productId),
          quantity: Number(item.quantity),
        })),
      });
      UiStore.notify(`Transferencia ${transfer.transferNumber ?? ''} solicitada correctamente.`.trim());
      this.items.value = [{ ...EMPTY_ITEM }];
      this.close();
      await this.parent.tick();
    } catch (error) {
      UiStore.fail(backendError(error, 'No se pudo crear la solicitud de transferencia.'));
    } finally {
      this.submitting.value = false;
    }
  }
}
