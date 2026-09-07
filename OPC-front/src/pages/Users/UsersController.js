import { signal, computed } from '@preact/signals-react';
import { Controller } from '@/lib/Controller';
import { ListFilter } from '@/lib/ListFilter';
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
  // Filtros en cliente con botón "Filtrar" (no filtra solo).
  filter = new ListFilter({ name: '', role: '', branchId: '', status: '' });

  form = new UserFormController(this);
  branchesPanel = new UserBranchesController(this);

  filteredUsers = computed(() => {
    const { name, role, branchId, status } = this.filter.applied.value;
    const query = name.trim().toLowerCase();
    return this.users.value
      .filter((user) => !role || user.roleCode === role)
      .filter((user) => !status || (status === 'active') === Boolean(user.active))
      .filter((user) => {
        if (!branchId) return true;
        if (user.roleCode === GENERAL_ADMIN) return true;
        return (this.branchesByUser.value[user.id] ?? []).map(String).includes(String(branchId));
      })
      .filter(
        (user) =>
          !query ||
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query),
      );
  });

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
