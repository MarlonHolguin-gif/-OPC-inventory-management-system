import { signal, computed } from '@preact/signals-react';
import { Controller } from '@/lib/Controller';
import { AuthStore } from '@/stores/AuthStore';
import { BranchDirectoryStore } from '@/stores/BranchDirectoryStore';
import { UiStore } from '@/stores/UiStore';
import { backendError } from '@/lib/format';
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
  }

  setUrgency = (value) => {
    this.urgency.value = value;
  };

  setDestination = (value) => {
    this.destinationBranchId.value = value;
  };

  setOrigin = (value) => {
    this.originBranchId.value = value;
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
