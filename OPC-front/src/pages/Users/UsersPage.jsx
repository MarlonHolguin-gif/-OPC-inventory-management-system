import { useController } from '@/lib/useController';
import { DataTable } from '@/components/DataTable';
import { CrudToolbar } from '@/components/CrudToolbar';
import { AsyncBoundary } from '@/components/AsyncBoundary';
import { Modal } from '@/components/Modal';
import { roleName } from '@/constants/roles';
import { UsersController } from './UsersController';
import { UserForm } from './components/UserForm';
import { UserBranchesPanel } from './components/UserBranchesPanel';
import './Users.css';

export default function UsersPage() {
  const controller = useController(UsersController);
  const form = controller.form;
  const panel = controller.branchesPanel;

  const columns = [
    { key: 'name', header: 'Nombre' },
    { key: 'email', header: 'Correo' },
    { key: 'role', header: 'Rol', render: (user) => roleName(user.roleCode) },
    { key: 'branches', header: 'Sucursales activas', render: (user) => controller.branchNamesFor(user) },
    { key: 'active', header: 'Estado', render: (user) => (user.active ? 'Activo' : 'Inactivo') },
  ];

  return (
    <main>
      <h1>Usuarios</h1>

      <AsyncBoundary variant="screen" loading={controller.loading.value}>
        <DataTable
          columns={columns}
          rows={controller.users.value}
          empty="No hay usuarios."
          actions={(user) => (
            <>
              <button type="button" onClick={() => form.startEdit(user)}>
                Editar
              </button>
              <button type="button" onClick={() => panel.open(user)}>
                Gestionar sucursales
              </button>
              {user.active ? (
                <button type="button" onClick={() => controller.deactivate(user.id)}>
                  Desactivar
                </button>
              ) : (
                <button type="button" onClick={() => controller.reactivate(user.id)}>
                  Reactivar
                </button>
              )}
            </>
          )}
        />

        <CrudToolbar label="Nuevo usuario" onCreate={form.openCreate} />

        {form.visible.value && (
          <Modal title={form.isEditing ? 'Editar usuario' : 'Nuevo usuario'} onClose={form.close}>
            <UserForm controller={controller} />
          </Modal>
        )}

        {panel.user.value && (
          <Modal title={`Sucursales de ${panel.user.value.name}`} onClose={panel.close} size="wide">
            <UserBranchesPanel controller={panel} />
          </Modal>
        )}
      </AsyncBoundary>
    </main>
  );
}
