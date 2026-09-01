import { signal } from '@preact/signals-react';
import { FormController } from '@/lib/FormController';
import { UiStore } from '@/stores/UiStore';
import { InventoryService } from '../services/InventoryService';

const EMPTY = { minStock: '', maxStock: '' };

/**
 * Formulario "Editar umbrales" (stock mínimo/máximo) de un producto en la
 * sucursal seleccionada — modal sobre la tabla de Inventario. Tras guardar,
 * le pide al controller padre que recargue el inventario de esa sucursal.
 */
export class InventoryThresholdController extends FormController {
  constructor(inventory) {
    super(EMPTY);
    this.inventory = inventory;
    this.productId = signal(null);
    this.productName = signal('');
  }

  startEdit(product) {
    const stock = this.inventory.inventoryByProductId.value[product.id];
    this.productId.value = product.id;
    this.productName.value = `${product.sku} — ${product.name}`;
    this.openEdit(product.id, {
      minStock: String(stock?.minStock ?? 0),
      maxStock: String(stock?.maxStock ?? 0),
    });
  }

  async submit(event) {
    event.preventDefault();
    const { minStock, maxStock } = this.form.value;

    const ok = await this.run(
      () =>
        InventoryService.updateThresholds(this.inventory.selectedBranchId.value, this.productId.value, {
          minStock: Number(minStock),
          maxStock: Number(maxStock),
        }),
      'No se pudieron guardar los umbrales.',
    );

    if (ok) {
      this.close();
      UiStore.notify('Umbrales actualizados.');
      await this.inventory.loadInventory();
    }
  }
}
