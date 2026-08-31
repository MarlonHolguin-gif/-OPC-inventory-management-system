import { FormController } from '@/lib/FormController';
import { PriceListService } from '../services/PriceListService';

const EMPTY = { name: '', description: '', startDate: '', endDate: '' };

export class PriceListFormController extends FormController {
  constructor(parent) {
    super(EMPTY);
    this.parent = parent;
  }

  startEdit(priceList) {
    this.openEdit(priceList.id, {
      name: priceList.name,
      description: priceList.description ?? '',
      startDate: priceList.startDate ?? '',
      endDate: priceList.endDate ?? '',
    });
  }

  async submit(event) {
    event.preventDefault();
    const { name, description, startDate, endDate } = this.form.value;
    const payload = {
      name,
      description: description || null,
      startDate: startDate || null,
      endDate: endDate || null,
    };

    const ok = await this.run(
      () =>
        this.isEditing
          ? PriceListService.update(this.editingId.value, payload)
          : PriceListService.create({ ...payload, items: [] }),
      'No se pudo guardar la lista de precios.',
    );

    if (ok) {
      this.close();
      await this.parent.load();
    }
  }
}
