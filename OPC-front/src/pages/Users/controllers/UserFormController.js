import { computed } from '@preact/signals-react';
import { FormController } from '@/lib/FormController';
import { ROLES, GENERAL_ADMIN } from '@/constants/roles';
import { UiStore } from '@/stores/UiStore';
import { UserService } from '../services/UserService';

const EMPTY = { name: '', email: '', password: '', roleCode: ROLES[0].code, branchId: '' };

export class UserFormController extends FormController {
  constructor(parent) {
    super(EMPTY);
    this.parent = parent;
  }

  needsBranch = computed(() => this.form.value.roleCode !== GENERAL_ADMIN);

  startEdit(user) {
    this.openEdit(user.id, {
      name: user.name,
      email: user.email,
      password: '',
      roleCode: user.roleCode,
    });
  }

  setRole = (value) => {
    // al cambiar de rol se limpia la sucursal (puede dejar de aplicar)
    this.form.value = { ...this.form.value, roleCode: value, branchId: '' };
  };

  async submit(event) {
    event.preventDefault();
    const { name, email, password, roleCode, branchId } = this.form.value;

    if (!this.isEditing && this.needsBranch.value && !branchId) {
      UiStore.fail('Selecciona a qué sucursal va a servir este usuario.');
      return;
    }

    const ok = await this.run(
      () =>
        this.isEditing
          ? UserService.update(this.editingId.value, { name, email, roleCode })
          : UserService.create({
              name,
              email,
              password,
              roleCode,
              branchIds: this.needsBranch.value ? [Number(branchId)] : [],
            }),
      'No se pudo guardar el usuario.',
    );

    if (ok) {
      this.close();
      await this.parent.loadUsers();
    }
  }
}
