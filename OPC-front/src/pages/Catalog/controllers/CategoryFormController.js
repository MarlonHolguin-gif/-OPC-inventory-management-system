import { FormController } from '@/lib/FormController';
import { UiStore } from '@/stores/UiStore';
import { backendError } from '@/lib/format';
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
    UiStore.clear();
    try {
      await CategoryService.deactivate(id);
      await this.catalog.loadAll();
      UiStore.notify('Categoría desactivada.');
    } catch (error) {
      // El backend explica el motivo (ej. tiene productos activos) — se muestra tal cual.
      UiStore.fail(backendError(error, 'No se pudo desactivar la categoría.'));
    }
  }

  async reactivate(id) {
    UiStore.clear();
    try {
      await CategoryService.reactivate(id);
      await this.catalog.loadAll();
      UiStore.notify('Categoría reactivada.');
    } catch (error) {
      UiStore.fail(backendError(error, 'No se pudo reactivar la categoría.'));
    }
  }

  async remove(category) {
    if (!window.confirm(`¿Eliminar definitivamente la categoría «${category.name}»?`)) return;
    UiStore.clear();
    try {
      await CategoryService.remove(category.id);
      await this.catalog.loadAll();
      UiStore.notify('Categoría eliminada.');
    } catch (error) {
      // El backend bloquea el borrado si hay productos asociados — se muestra tal cual.
      UiStore.fail(backendError(error, 'No se pudo eliminar la categoría.'));
    }
  }
}
