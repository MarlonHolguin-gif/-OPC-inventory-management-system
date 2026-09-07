import { computed } from '@preact/signals-react';
import { CrudListController } from '@/lib/CrudListController';
import { ListFilter } from '@/lib/ListFilter';
import { SupplierService } from './services/SupplierService';
import { SupplierFormController } from './controllers/SupplierFormController';

export class SuppliersController extends CrudListController {
  service = SupplierService;
  errors = {
    load: 'No se pudo cargar la lista de proveedores.',
    deactivate: 'No se pudo desactivar el proveedor.',
    reactivate: 'No se pudo reactivar el proveedor.',
  };

  // Filtros en cliente con botón "Filtrar".
  filter = new ListFilter({ name: '', contact: '', status: '' });
  form = new SupplierFormController(this);

  filtered = computed(() => {
    const { name, contact, status } = this.filter.applied.value;
    const nameQuery = name.trim().toLowerCase();
    const contactQuery = contact.trim().toLowerCase();
    return this.items.value
      .filter((supplier) => !nameQuery || (supplier.name ?? '').toLowerCase().includes(nameQuery))
      .filter((supplier) => !contactQuery || (supplier.contact ?? '').toLowerCase().includes(contactQuery))
      .filter((supplier) => !status || (status === 'active') === Boolean(supplier.active));
  });
}
