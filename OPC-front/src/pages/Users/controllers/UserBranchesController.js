import { signal } from '@preact/signals-react';
import { UiStore } from '@/stores/UiStore';
import { UserService } from '../services/UserService';

/**
 * Panel "Gestionar sucursales" de un usuario. `user` en null = panel cerrado.
 */
export class UserBranchesController {
  constructor(parent) {
    this.parent = parent;
  }

  user = signal(null);
  assignedIds = signal([]);
  loading = signal(false);

  open = (user) => {
    this.user.value = user;
    this.load();
  };

  close = () => {
    this.user.value = null;
    this.assignedIds.value = [];
  };

  async load() {
    const user = this.user.value;
    if (!user) return;
    this.loading.value = true;
    try {
      this.assignedIds.value = await UserService.branchesOf(user.id);
    } catch {
      UiStore.fail('No se pudo cargar las sucursales del usuario.');
    } finally {
      this.loading.value = false;
    }
  }

  async toggle(branchId, isAssigned) {
    const user = this.user.value;
    UiStore.clear();
    try {
      if (isAssigned) {
        await UserService.unassignBranch(user.id, branchId);
      } else {
        await UserService.assignBranch(user.id, branchId);
      }
      await this.load();
      await this.parent.loadUsers();
    } catch {
      UiStore.fail('No se pudo actualizar la sucursal del usuario.');
    }
  }
}
