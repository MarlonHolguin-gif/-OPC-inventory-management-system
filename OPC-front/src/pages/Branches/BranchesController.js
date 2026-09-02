import { CrudListController } from '@/lib/CrudListController';
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

  form = new BranchFormController(this);

  async deactivate(id) {
    await super.deactivate(id);
    BranchDirectoryStore.reset();
  }

  async reactivate(id) {
    await super.reactivate(id);
    BranchDirectoryStore.reset();
  }
}
