import { computed } from '@preact/signals-react';
import { CrudListController } from '@/lib/CrudListController';
import { ListFilter } from '@/lib/ListFilter';
import { CustomerService } from './services/CustomerService';
import { CustomerFormController } from './controllers/CustomerFormController';

const documentText = (customer) =>
  `${customer.documentType ?? ''} ${customer.documentNumber ?? ''}`.trim().toLowerCase();

export class CustomersController extends CrudListController {
  service = CustomerService;
  errors = {
    load: 'No se pudo cargar la lista de clientes.',
    deactivate: 'No se pudo desactivar el cliente.',
    reactivate: 'No se pudo reactivar el cliente.',
  };

  // Filtros en cliente con botón "Filtrar".
  filter = new ListFilter({ name: '', document: '', status: '' });
  form = new CustomerFormController(this);

  filtered = computed(() => {
    const { name, document, status } = this.filter.applied.value;
    const nameQuery = name.trim().toLowerCase();
    const documentQuery = document.trim().toLowerCase();
    return this.items.value
      .filter((customer) => !nameQuery || (customer.name ?? '').toLowerCase().includes(nameQuery))
      .filter((customer) => !documentQuery || documentText(customer).includes(documentQuery))
      .filter((customer) => !status || (status === 'active') === Boolean(customer.active));
  });
}
