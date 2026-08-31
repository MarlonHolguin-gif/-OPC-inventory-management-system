import { signal, computed } from '@preact/signals-react';
import { UiStore } from '@/stores/UiStore';
import { backendError } from '@/lib/format';
import { PriceListService } from '../services/PriceListService';

const EMPTY_ITEM = { productId: '', price: '' };

/**
 * Panel "Gestionar ítems" de una lista de precios. `selectedListId` en null =
 * panel cerrado. Los ítems vienen embebidos en el objeto lista, así que tras
 * cada cambio se recarga el listado del padre.
 */
export class PriceListItemsController {
  constructor(parent) {
    this.parent = parent;
  }

  selectedListId = signal(null);
  itemForm = signal({ ...EMPTY_ITEM });

  list = computed(
    () => this.parent.items.value.find((l) => l.id === this.selectedListId.value) ?? null,
  );

  open = (id) => {
    this.selectedListId.value = id;
    this.itemForm.value = { ...EMPTY_ITEM };
  };

  close = () => {
    this.selectedListId.value = null;
  };

  setItemField = (key, value) => {
    this.itemForm.value = { ...this.itemForm.value, [key]: value };
  };

  async upsert(event) {
    event.preventDefault();
    UiStore.clear();
    try {
      await PriceListService.upsertItem(this.selectedListId.value, {
        productId: Number(this.itemForm.value.productId),
        price: Number(this.itemForm.value.price),
      });
      this.itemForm.value = { ...EMPTY_ITEM };
      await this.parent.load();
    } catch (error) {
      UiStore.fail(backendError(error, 'No se pudo guardar el precio del producto.'));
    }
  }

  async remove(productId) {
    UiStore.clear();
    try {
      await PriceListService.removeItem(this.selectedListId.value, productId);
      await this.parent.load();
    } catch (error) {
      UiStore.fail(backendError(error, 'No se pudo eliminar el precio del producto.'));
    }
  }
}
