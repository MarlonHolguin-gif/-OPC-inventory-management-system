import { signal, computed } from '@preact/signals-react';
import { Controller } from '@/lib/Controller';
import { UiStore } from '@/stores/UiStore';
import { BranchDirectoryStore } from '@/stores/BranchDirectoryStore';
import { backendError } from '@/lib/format';
import { PurchaseService } from '../services/PurchaseService';

const CLOSED_STATUSES = ['FULLY_RECEIVED', 'CANCELLED'];

export function pendingQuantity(item) {
  return Number(item.quantity) - Number(item.receivedQuantity);
}

export class PurchaseOrderDetailController extends Controller {
  constructor(orderId) {
    super();
    this.orderId = orderId;
  }

  order = signal(null);
  loading = signal(true);
  notFound = signal(false);
  notes = signal('');
  submitting = signal(false);
  transitioning = signal(false);
  confirmingCancel = signal(false);

  isClosed = computed(() => CLOSED_STATUSES.includes(this.order.value?.status));

  // Enviar al proveedor solo tiene sentido desde borrador.
  canSend = computed(() => this.order.value?.status === 'DRAFT');

  // Cancelar solo una orden en borrador. Una vez enviada al proveedor el
  // único camino es la recepción (total); no hay botón de cancelar junto a
  // la recepción.
  canCancel = computed(() => this.order.value?.status === 'DRAFT');

  // La recepción de mercancía solo se habilita una vez enviada la orden. La
  // recepción es siempre total (se recibe todo lo pendiente) o se cancela.
  canReceive = computed(() => {
    const status = this.order.value?.status;
    return status === 'SENT' || status === 'PARTIALLY_RECEIVED';
  });

  pendingItems = computed(() =>
    (this.order.value?.items ?? []).filter((item) => pendingQuantity(item) > 0),
  );

  branchName = computed(() => {
    const id = this.order.value?.branchId;
    if (id == null) return null;
    return BranchDirectoryStore.nameOf(id) ?? `Sucursal ${id}`;
  });

  onMount() {
    return this.load();
  }

  async load() {
    this.loading.value = true;
    try {
      const [order] = await Promise.all([
        PurchaseService.get(this.orderId),
        BranchDirectoryStore.ensureLoaded(),
      ]);
      this.order.value = order;
      this.notFound.value = false;
    } catch (error) {
      if (error?.response?.status === 404) {
        this.notFound.value = true;
      } else {
        UiStore.fail('No se pudo cargar la orden de compra.');
      }
    } finally {
      this.loading.value = false;
    }
  }

  setNotes = (value) => {
    this.notes.value = value;
  };

  markAsSent = async () => {
    UiStore.clear();
    this.transitioning.value = true;
    try {
      await PurchaseService.markAsSent(this.orderId);
      await this.load();
      UiStore.notify('La orden se marcó como enviada al proveedor.');
    } catch (error) {
      UiStore.fail(backendError(error, 'No se pudo enviar la orden al proveedor.'));
    } finally {
      this.transitioning.value = false;
    }
  };

  askCancel = () => {
    this.confirmingCancel.value = true;
  };

  dismissCancel = () => {
    this.confirmingCancel.value = false;
  };

  confirmCancel = async () => {
    UiStore.clear();
    this.transitioning.value = true;
    try {
      await PurchaseService.cancel(this.orderId);
      this.confirmingCancel.value = false;
      await this.load();
      UiStore.notify('La orden de compra se canceló.');
    } catch (error) {
      UiStore.fail(backendError(error, 'No se pudo cancelar la orden de compra.'));
    } finally {
      this.transitioning.value = false;
    }
  };

  async submit(event) {
    event.preventDefault();
    UiStore.clear();

    if (this.pendingItems.value.length === 0) {
      UiStore.fail('Esta orden no tiene mercancía pendiente por recibir.');
      return;
    }

    this.submitting.value = true;
    try {
      await PurchaseService.registerReceipt(this.orderId, { notes: this.notes.value || null });
      this.notes.value = '';
      await this.load();
      UiStore.notify('Orden recibida por completo.');
    } catch (error) {
      UiStore.fail(backendError(error, 'No se pudo registrar la recepción.'));
    } finally {
      this.submitting.value = false;
    }
  }
}
