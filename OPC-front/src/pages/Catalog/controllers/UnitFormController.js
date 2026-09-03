import { FormController } from '@/lib/FormController';
import { UiStore } from '@/stores/UiStore';
import { backendError } from '@/lib/format';
import { UnitService } from '../services/UnitService';

const EMPTY = { name: '', abbreviation: '' };

export class UnitFormController extends FormController {
  constructor(catalog) {
    super(EMPTY);
    this.catalog = catalog;
  }

  startEdit(unit) {
    this.openEdit(unit.id, { name: unit.name, abbreviation: unit.abbreviation });
  }

  async submit(event) {
    event.preventDefault();
    const payload = { ...this.form.value };

    const ok = await this.run(
      () =>
        this.isEditing
          ? UnitService.update(this.editingId.value, payload)
          : UnitService.create(payload),
      'No se pudo guardar la unidad de medida.',
    );

    if (ok) {
      this.close();
      await this.catalog.loadAll();
    }
  }

  async deactivate(id) {
    UiStore.clear();
    try {
      await UnitService.deactivate(id);
      await this.catalog.loadAll();
      UiStore.notify('Unidad de medida desactivada.');
    } catch (error) {
      UiStore.fail(backendError(error, 'No se pudo desactivar la unidad de medida.'));
    }
  }

  async reactivate(id) {
    UiStore.clear();
    try {
      await UnitService.reactivate(id);
      await this.catalog.loadAll();
      UiStore.notify('Unidad de medida reactivada.');
    } catch (error) {
      UiStore.fail(backendError(error, 'No se pudo reactivar la unidad de medida.'));
    }
  }

  async remove(unit) {
    if (!window.confirm(`¿Eliminar definitivamente la unidad «${unit.name}»?`)) return;
    UiStore.clear();
    try {
      await UnitService.remove(unit.id);
      await this.catalog.loadAll();
      UiStore.notify('Unidad de medida eliminada.');
    } catch (error) {
      // El backend bloquea el borrado si algún producto la usa — se muestra tal cual.
      UiStore.fail(backendError(error, 'No se pudo eliminar la unidad de medida.'));
    }
  }
}
