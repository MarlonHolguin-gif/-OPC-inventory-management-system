import { FormController } from '@/lib/FormController';
import { CustomerService } from '../services/CustomerService';

const EMPTY = { name: '', documentType: '', documentNumber: '', phone: '', email: '' };

function nullifyBlanks(values) {
  return {
    name: values.name,
    documentType: values.documentType || null,
    documentNumber: values.documentNumber || null,
    phone: values.phone || null,
    email: values.email || null,
  };
}

export class CustomerFormController extends FormController {
  constructor(parent) {
    super(EMPTY);
    this.parent = parent;
  }

  startEdit(customer) {
    this.openEdit(customer.id, {
      name: customer.name,
      documentType: customer.documentType ?? '',
      documentNumber: customer.documentNumber ?? '',
      phone: customer.phone ?? '',
      email: customer.email ?? '',
    });
  }

  async submit(event) {
    event.preventDefault();
    const payload = nullifyBlanks(this.form.value);

    const ok = await this.run(
      () =>
        this.isEditing
          ? CustomerService.update(this.editingId.value, payload)
          : CustomerService.create(payload),
      'No se pudo guardar el cliente.',
    );

    if (ok) {
      this.close();
      await this.parent.load();
    }
  }
}
