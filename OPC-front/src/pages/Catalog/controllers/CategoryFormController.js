import { FormController } from '@/lib/FormController';
import { UiStore } from '@/stores/UiStore';
import { CategoryService } from '../services/CategoryService';

const EMPTY = { name: '', description: '' };

export class CategoryFormController extends FormController {
  constructor(catalog) {
    super(EMPTY);
    this.catalog = catalog;
  }

  startEdit(category) {
    this.openEdit(category.id, {
      name: category.name,
      description: category.description ?? '',
    });
  }

  async submit(event) {
    event.preventDefault();
    const { name, description } = this.form.value;
    const payload = { name, description: description || null };

    const ok = await this.run(
      () =>
        this.isEditing
          ? CategoryService.update(this.editingId.value, payload)
          : CategoryService.create(payload),
      'No se pudo guardar la categoría.',
    );

    if (ok) {
      this.close();
      await this.catalog.loadAll();
    }
  }

  async deactivate(id) {
    try {
      await CategoryService.deactivate(id);
      await this.catalog.loadAll();
    } catch {
      UiStore.fail('No se pudo desactivar la categoría.');
    }
  }
}
