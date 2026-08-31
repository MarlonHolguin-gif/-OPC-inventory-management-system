import { FormController } from '@/lib/FormController';
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
}
