import { signal } from '@preact/signals-react';
import { Controller } from '@/lib/Controller';
import { BranchDirectoryStore } from '@/stores/BranchDirectoryStore';
import { UiStore } from '@/stores/UiStore';
import { GENERAL_ADMIN } from '@/constants/roles';
import { UserService } from './services/UserService';
import { UserFormController } from './controllers/UserFormController';
import { UserBranchesController } from './controllers/UserBranchesController';

export class UsersController extends Controller {
  users = signal([]);
  branchesByUser = signal({}); // { userId: [branchId, ...] }
  loading = signal(true);

  form = new UserFormController(this);
  branchesPanel = new UserBranchesController(this);

  async onMount() {
    await BranchDirectoryStore.ensureLoaded();
    await this.loadUsers();
    this.loading.value = false;
  }

  branchNamesFor(user) {
    if (user.roleCode === GENERAL_ADMIN) return 'Todas';
    const ids = this.branchesByUser.value[user.id] ?? [];
    if (ids.length === 0) return '—';
    return ids.map((id) => BranchDirectoryStore.nameOf(id) ?? id).join(', ');
  }

  async loadUsers() {
    try {
      const users = await UserService.list();
      this.users.value = users;
      const entries = await Promise.all(
        users.map((user) => UserService.branchesOf(user.id).then((ids) => [user.id, ids])),
      );
      this.branchesByUser.value = Object.fromEntries(entries);
    } catch {
      UiStore.fail('No se pudo cargar la lista de usuarios.');
    }
  }

  async deactivate(id) {
    try {
      await UserService.deactivate(id);
      await this.loadUsers();
    } catch {
      UiStore.fail('No se pudo desactivar el usuario.');
    }
  }

  async reactivate(id) {
    try {
      await UserService.reactivate(id);
      await this.loadUsers();
    } catch {
      UiStore.fail('No se pudo reactivar el usuario.');
    }
  }
}
