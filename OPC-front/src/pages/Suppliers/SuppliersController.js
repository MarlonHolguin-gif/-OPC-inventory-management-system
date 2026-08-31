import { signal, computed } from '@preact/signals-react';
import { CrudListController } from '@/lib/CrudListController';
import { SupplierService } from './services/SupplierService';
import { SupplierFormController } from './controllers/SupplierFormController';

export class SuppliersController extends CrudListController {
  service = SupplierService;
  errors = {
    load: 'No se pudo cargar la lista de proveedores.',
    deactivate: 'No se pudo desactivar el proveedor.',
    reactivate: 'No se pudo reactivar el proveedor.',
  };

  search = signal('');
  form = new SupplierFormController(this);

  filtered = computed(() => {
    const term = this.search.value.trim().toLowerCase();
    if (!term) return this.items.value;
    return this.items.value.filter((supplier) => supplier.name.toLowerCase().includes(term));
  });

  setSearch = (value) => {
    this.search.value = value;
  };
}
