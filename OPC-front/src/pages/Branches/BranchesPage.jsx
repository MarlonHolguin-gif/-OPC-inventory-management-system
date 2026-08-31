import { useController } from '@/lib/useController';
import { DataTable } from '@/components/DataTable';
import { CrudToolbar } from '@/components/CrudToolbar';
import { AsyncBoundary } from '@/components/AsyncBoundary';
import { EntityForm } from '@/components/EntityForm';
import { Modal } from '@/components/Modal';
import { BranchesController } from './BranchesController';

const COLUMNS = [
  { key: 'code', header: 'Código' },
  { key: 'name', header: 'Nombre' },
  { key: 'city', header: 'Ciudad' },
  { key: 'phone', header: 'Teléfono' },
  { key: 'active', header: 'Estado', render: (b) => (b.active ? 'Activa' : 'Inactiva') },
];

const FIELDS = [
  { key: 'code', label: 'Código', required: true, disabledOnEdit: true },
  { key: 'name', label: 'Nombre', required: true },
  { key: 'address', label: 'Dirección' },
  { key: 'city', label: 'Ciudad' },
  { key: 'phone', label: 'Teléfono' },
];

export default function BranchesPage() {
  const controller = useController(BranchesController);
  const form = controller.form;

  return (
    <main>
      <h1>Sucursales</h1>

      <AsyncBoundary loading={controller.loading.value}>
        <DataTable
          columns={COLUMNS}
          rows={controller.items.value}
          empty="No hay sucursales."
          actions={(branch) => (
            <>
              <button type="button" onClick={() => form.startEdit(branch)}>
                Editar
              </button>
              {branch.active && (
                <button type="button" onClick={() => controller.deactivate(branch.id)}>
                  Desactivar
                </button>
              )}
            </>
          )}
        />

        <CrudToolbar label="Nueva sucursal" onCreate={form.openCreate} />

        {form.visible.value && (
          <Modal title={form.isEditing ? 'Editar sucursal' : 'Nueva sucursal'} onClose={form.close}>
            <EntityForm
              controller={form}
              submitLabel={form.isEditing ? 'Guardar cambios' : 'Crear sucursal'}
              fields={FIELDS}
            />
          </Modal>
        )}
      </AsyncBoundary>
    </main>
  );
}
