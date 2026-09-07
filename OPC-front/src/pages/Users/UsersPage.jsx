import { useController } from '@/lib/useController';
import { DataTable } from '@/components/DataTable';
import { AsyncBoundary } from '@/components/AsyncBoundary';
import { Modal } from '@/components/Modal';
import { FilterBar, FilterField } from '@/components/FilterBar';
import { TextField, SelectField } from '@/components/Field';
import { BranchDirectoryStore } from '@/stores/BranchDirectoryStore';
import { ROLES, roleName } from '@/constants/roles';
import { UsersController } from './UsersController';
import { UserForm } from './components/UserForm';
import { UserBranchesPanel } from './components/UserBranchesPanel';
import './Users.css';

const ROLE_OPTIONS = ROLES.map((role) => ({ value: role.code, label: role.name }));
const STATUS_OPTIONS = [
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
];

export default function UsersPage() {
  const controller = useController(UsersController);
  const form = controller.form;
  const panel = controller.branchesPanel;
  const filter = controller.filter;
  const draft = filter.draft.value;
  const branchOptions = BranchDirectoryStore.all.value.map((b) => ({ value: b.id, label: b.name }));

  const columns = [
    { key: 'name', header: 'Nombre' },
    { key: 'email', header: 'Correo' },
    { key: 'role', header: 'Rol', render: (user) => roleName(user.roleCode) },
    { key: 'branches', header: 'Sucursales activas', render: (user) => controller.branchNamesFor(user) },
    { key: 'active', header: 'Estado', render: (user) => (user.active ? 'Activo' : 'Inactivo') },
  ];

  return (
    <main className="users-page">
      <FilterBar onSubmit={filter.apply}>
        <FilterField>
          <TextField
            label="Nombre o correo"
            value={draft.name}
            onChange={(value) => filter.set('name', value)}
            placeholder="Filtra los resultados"
          />
        </FilterField>
        <FilterField>
          <SelectField
            label="Rol"
            value={draft.role}
            onChange={(value) => filter.set('role', value)}
            options={ROLE_OPTIONS}
            placeholder="Todos"
          />
        </FilterField>
        <FilterField>
          <SelectField
            label="Sucursales activas"
            value={draft.branchId}
            onChange={(value) => filter.set('branchId', value)}
            options={branchOptions}
            placeholder="Todas"
          />
        </FilterField>
        <FilterField>
          <SelectField
            label="Estado"
            value={draft.status}
            onChange={(value) => filter.set('status', value)}
            options={STATUS_OPTIONS}
            placeholder="Todos"
          />
        </FilterField>
        <FilterBar.Actions>
          <button type="submit">Filtrar</button>
          <button type="button" onClick={filter.clear}>
            Limpiar filtros
          </button>
        </FilterBar.Actions>
        <button type="button" className="button-link primary filter-bar-cta" onClick={form.openCreate}>
          + Nuevo usuario
        </button>
      </FilterBar>

      <AsyncBoundary loading={controller.loading.value}>
        <div className="users-table-card">
          <DataTable
            columns={columns}
            rows={controller.filteredUsers.value}
            empty="No hay usuarios que coincidan con los filtros"
            actions={(user) => (
              <>
                <button type="button" onClick={() => form.startEdit(user)}>
                  Editar
                </button>
                <button type="button" onClick={() => panel.open(user)}>
                  Gestionar sucursales
                </button>
                {user.active ? (
                  <button
                    type="button"
                    className="button-danger"
                    onClick={() => controller.deactivate(user.id)}
                  >
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
        </div>
      </AsyncBoundary>

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
    </main>
  );
}
