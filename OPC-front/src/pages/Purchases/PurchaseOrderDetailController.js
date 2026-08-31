import { signal, computed } from '@preact/signals-react';
import { Controller } from '@/lib/Controller';
import { UiStore } from '@/stores/UiStore';
import { backendError } from '@/lib/format';
import { PurchaseService } from './services/PurchaseService';

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
  receiveQuantities = signal({});
  notes = signal('');
  submitting = signal(false);

  isClosed = computed(() => CLOSED_STATUSES.includes(this.order.value?.status));

  pendingItems = computed(() =>
    (this.order.value?.items ?? []).filter((item) => pendingQuantity(item) > 0),
  );

  onMount() {
    return this.load();
  }

  async load() {
    try {
      const order = await PurchaseService.get(this.orderId);
      this.order.value = order;
      // Precarga cada input con la cantidad pendiente por ítem — el usuario
      // puede bajarla para una recepción parcial.
      this.receiveQuantities.value = Object.fromEntries(
        order.items.map((item) => [
          item.id,
          pendingQuantity(item) > 0 ? String(pendingQuantity(item)) : '0',
        ]),
      );
    } catch {
      UiStore.fail('No se pudo cargar la orden de compra.');
    }
  }

  setReceiveQuantity = (itemId, value) => {
    this.receiveQuantities.value = { ...this.receiveQuantities.value, [itemId]: value };
  };

  setNotes = (value) => {
    this.notes.value = value;
  };

  async submit(event) {
    event.preventDefault();
    UiStore.clear();

    const items = this.order.value.items
      .map((item) => ({
        purchaseOrderItemId: item.id,
        receivedQuantity: Number(this.receiveQuantities.value[item.id]),
      }))
      .filter((item) => item.receivedQuantity > 0);

    if (items.length === 0) {
      UiStore.fail('Indica al menos una cantidad a recibir mayor que cero.');
      return;
    }

    this.submitting.value = true;
    try {
      await PurchaseService.registerReceipt(this.orderId, {
        notes: this.notes.value || null,
        items,
      });
      this.notes.value = '';
      await this.load();
      UiStore.notify('Recepción registrada correctamente.');
    } catch (error) {
      UiStore.fail(backendError(error, 'No se pudo registrar la recepción.'));
    } finally {
      this.submitting.value = false;
    }
  }
}
