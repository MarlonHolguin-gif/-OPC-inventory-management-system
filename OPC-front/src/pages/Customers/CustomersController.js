import { signal, computed } from '@preact/signals-react';
import { CrudListController } from '@/lib/CrudListController';
import { CustomerService } from './services/CustomerService';
import { CustomerFormController } from './controllers/CustomerFormController';

export class CustomersController extends CrudListController {
  service = CustomerService;
  errors = {
    load: 'No se pudo cargar la lista de clientes.',
    deactivate: 'No se pudo desactivar el cliente.',
    reactivate: 'No se pudo reactivar el cliente.',
  };

  search = signal('');
  form = new CustomerFormController(this);

  filtered = computed(() => {
    const term = this.search.value.trim().toLowerCase();
    if (!term) return this.items.value;
    return this.items.value.filter((customer) => customer.name.toLowerCase().includes(term));
  });

  setSearch = (value) => {
    this.search.value = value;
  };
}
