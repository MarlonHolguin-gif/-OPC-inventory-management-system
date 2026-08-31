import { FormController } from '@/lib/FormController';
import { UiStore } from '@/stores/UiStore';
import { ProductService } from '../services/ProductService';

const EMPTY = {
  sku: '',
  name: '',
  description: '',
  categoryId: '',
  baseUnitId: '',
  referencePrice: '',
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
    const { sku, name, description, categoryId, baseUnitId, referencePrice } = this.form.value;
    const payload = {
      name,
      description: description || null,
      categoryId: Number(categoryId),
      baseUnitId: Number(baseUnitId),
      referencePrice: referencePrice ? Number(referencePrice) : null,
    };

    const ok = await this.run(
      () =>
        this.isEditing
          ? ProductService.update(this.editingId.value, payload)
          : ProductService.create({ ...payload, sku }),
      'No se pudo guardar el producto.',
    );

    if (ok) {
      this.close();
      await this.catalog.loadAll();
    }
  }

  async deactivate(id) {
    try {
      await ProductService.deactivate(id);
      await this.catalog.loadAll();
    } catch {
      UiStore.fail('No se pudo desactivar el producto.');
    }
  }
}
