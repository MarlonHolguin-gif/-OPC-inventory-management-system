import { signal } from '@preact/signals-react';
import { UiStore } from '@/stores/UiStore';
import { backendError } from '@/lib/format';
import { ProductUnitService } from '../services/ProductUnitService';

const EMPTY_FORM = { unitId: '', conversionFactor: '', isPurchaseUnit: false, isSaleUnit: false };

/**
 * Panel "Gestionar unidades" de un producto: unidades alternativas y sus
 * factores de conversión. `product` en null = panel cerrado.
 */
export class ProductUnitsController {
  product = signal(null);
  rows = signal([]);
  loading = signal(false);
  form = signal({ ...EMPTY_FORM });

  setField = (key, value) => {
    this.form.value = { ...this.form.value, [key]: value };
  };

  open = (product) => {
    this.product.value = product;
    this.form.value = { ...EMPTY_FORM };
    this.load();
  };

  close = () => {
    this.product.value = null;
    this.rows.value = [];
  };

  async load() {
    const product = this.product.value;
    if (!product) return;
    this.loading.value = true;
    try {
      this.rows.value = await ProductUnitService.list(product.id);
    } catch {
      UiStore.fail('No se pudo cargar las unidades del producto.');
    } finally {
      this.loading.value = false;
    }
  }

  async submit(event) {
    event.preventDefault();
    const product = this.product.value;
    const { unitId, conversionFactor, isPurchaseUnit, isSaleUnit } = this.form.value;
    UiStore.clear();
    try {
      await ProductUnitService.upsert(product.id, {
        unitId: Number(unitId),
        conversionFactor: Number(conversionFactor),
        isPurchaseUnit,
        isSaleUnit,
      });
      this.form.value = { ...EMPTY_FORM };
      await this.load();
    } catch (error) {
      UiStore.fail(backendError(error, 'No se pudo guardar la unidad del producto.'));
    }
  }

  async remove(unitId) {
    const product = this.product.value;
    UiStore.clear();
    try {
      await ProductUnitService.remove(product.id, unitId);
      await this.load();
    } catch {
      UiStore.fail('No se pudo eliminar la unidad del producto.');
    }
  }
}
