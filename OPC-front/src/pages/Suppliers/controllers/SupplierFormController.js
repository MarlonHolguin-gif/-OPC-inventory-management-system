import { FormController } from '@/lib/FormController';
import { SupplierService } from '../services/SupplierService';

const EMPTY = { name: '', taxId: '', contact: '', phone: '', email: '', address: '' };

export class SupplierFormController extends FormController {
  constructor(parent) {
    super(EMPTY);
    this.parent = parent;
  }

  startEdit(supplier) {
    this.openEdit(supplier.id, {
      name: supplier.name,
      taxId: supplier.taxId ?? '',
      contact: supplier.contact ?? '',
      phone: supplier.phone ?? '',
      email: supplier.email ?? '',
      address: supplier.address ?? '',
    });
  }

  async submit(event) {
    event.preventDefault();
    const payload = { ...this.form.value, taxId: this.form.value.taxId.trim() || null };

    const ok = await this.run(
      () =>
        this.isEditing
          ? SupplierService.update(this.editingId.value, payload)
          : SupplierService.create(payload),
      'No se pudo guardar el proveedor.',
    );

    if (ok) {
      this.close();
      await this.parent.load();
    }
  }
}
