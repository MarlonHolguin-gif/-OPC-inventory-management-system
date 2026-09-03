import { FormController } from '@/lib/FormController';
import { UiStore } from '@/stores/UiStore';
import { backendError } from '@/lib/format';
import { ProductService } from '../services/ProductService';

// Valor del select de sucursal del stock inicial que significa "repartir la
// misma cantidad en todas las sucursales activas".
export const ALL_BRANCHES = 'ALL';

const EMPTY = {
  sku: '',
  name: '',
  description: '',
  categoryId: '',
  baseUnitId: '',
  referencePrice: '',
  // Solo se usan al crear: cargan stock inicial vía un ajuste positivo.
  initialStock: '',
  // branchId de destino, o ALL_BRANCHES para todas las sucursales activas.
  initialStockBranchId: '',
};

export class ProductFormController extends FormController {
  constructor(catalog) {
    super(EMPTY);
    this.catalog = catalog;
  }

  startEdit(product) {
    this.openEdit(product.id, {
      sku: product.sku,
      name: product.name,
      description: product.description ?? '',
      categoryId: product.categoryId,
      baseUnitId: product.baseUnitId,
      referencePrice: product.referencePrice ?? '',
    });
  }

  async submit(event) {
    event.preventDefault();
    const { sku, name, description, categoryId, baseUnitId, referencePrice, initialStock, initialStockBranchId } =
      this.form.value;
    const payload = {
      name,
      description: description || null,
      categoryId: Number(categoryId),
      baseUnitId: Number(baseUnitId),
      referencePrice: referencePrice ? Number(referencePrice) : null,
    };

    const allBranches = initialStockBranchId === ALL_BRANCHES;

    const ok = await this.run(
      () =>
        this.isEditing
          ? ProductService.update(this.editingId.value, payload)
          : ProductService.create({
              ...payload,
              sku,
              initialStock: initialStock ? Number(initialStock) : null,
              initialStockBranchId:
                !allBranches && initialStockBranchId ? Number(initialStockBranchId) : null,
              initialStockAllBranches: allBranches,
            }),
      'No se pudo guardar el producto.',
    );

    if (ok) {
      this.close();
      await this.catalog.loadAll();
    }
  }

  async deactivate(id) {
    UiStore.clear();
    try {
      await ProductService.deactivate(id);
      await this.catalog.loadAll();
      UiStore.notify('Producto desactivado.');
    } catch (error) {
      UiStore.fail(backendError(error, 'No se pudo desactivar el producto.'));
    }
  }

  async reactivate(id) {
    UiStore.clear();
    try {
      await ProductService.reactivate(id);
      await this.catalog.loadAll();
      UiStore.notify('Producto reactivado.');
    } catch (error) {
      // El backend explica el motivo (ej. su categoría está inactiva) — se muestra tal cual.
      UiStore.fail(backendError(error, 'No se pudo reactivar el producto.'));
    }
  }
}
