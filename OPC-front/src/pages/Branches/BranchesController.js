import { computed } from '@preact/signals-react';
import { CrudListController } from '@/lib/CrudListController';
import { ListFilter } from '@/lib/ListFilter';
import { BranchDirectoryStore } from '@/stores/BranchDirectoryStore';
import { BranchService } from './services/BranchService';
import { BranchFormController } from './controllers/BranchFormController';

export class BranchesController extends CrudListController {
  service = BranchService;
  errors = {
    load: 'No se pudo cargar la lista de sucursales.',
    deactivate: 'No se pudo desactivar la sucursal.',
    reactivate: 'No se pudo reactivar la sucursal.',
  };

  // Filtros en cliente con botón "Filtrar".
  filter = new ListFilter({ code: '', name: '', city: '', status: '' });

  form = new BranchFormController(this);

  cityOptions = computed(() =>
    [...new Set(this.items.value.map((branch) => branch.city).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b))
      .map((city) => ({ value: city, label: city })),
  );

  filtered = computed(() => {
    const { code, name, city, status } = this.filter.applied.value;
    const codeQuery = code.trim().toLowerCase();
    const nameQuery = name.trim().toLowerCase();
    return this.items.value
      .filter((branch) => !codeQuery || (branch.code ?? '').toLowerCase().includes(codeQuery))
      .filter((branch) => !nameQuery || (branch.name ?? '').toLowerCase().includes(nameQuery))
      .filter((branch) => !city || branch.city === city)
      .filter((branch) => !status || (status === 'active') === Boolean(branch.active));
  });

  async deactivate(id) {
    await super.deactivate(id);
    BranchDirectoryStore.reset();
  }

  async reactivate(id) {
    await super.reactivate(id);
    BranchDirectoryStore.reset();
  }
}
