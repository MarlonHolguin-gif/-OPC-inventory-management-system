import { useController } from '@/lib/useController';
import { DataTable } from '@/components/DataTable';
import { AsyncBoundary } from '@/components/AsyncBoundary';
import { EntityForm } from '@/components/EntityForm';
import { Modal } from '@/components/Modal';
import { FilterBar, FilterField } from '@/components/FilterBar';
import { TextField, SelectField } from '@/components/Field';
import { BranchesController } from './BranchesController';
import './Branches.css';

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

const STATUS_OPTIONS = [
  { value: 'active', label: 'Activa' },
  { value: 'inactive', label: 'Inactiva' },
];

export default function BranchesPage() {
  const controller = useController(BranchesController);
  const form = controller.form;
  const filter = controller.filter;
  const draft = filter.draft.value;

  return (
    <main className="branches-page">
      <FilterBar onSubmit={filter.apply}>
        <FilterField>
          <TextField
            label="Código"
            value={draft.code}
            onChange={(value) => filter.set('code', value)}
            placeholder="Filtra los resultados"
          />
        </FilterField>
        <FilterField>
          <TextField
            label="Nombre"
            value={draft.name}
            onChange={(value) => filter.set('name', value)}
            placeholder="Filtra los resultados"
          />
        </FilterField>
        <FilterField>
          <SelectField
            label="Ciudad"
            value={draft.city}
            onChange={(value) => filter.set('city', value)}
            options={controller.cityOptions.value}
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
          + Nueva sucursal
        </button>
      </FilterBar>

      <AsyncBoundary loading={controller.loading.value}>
        <div className="branches-table-card">
          <DataTable
            columns={COLUMNS}
            rows={controller.filtered.value}
            empty="No hay sucursales que coincidan con los filtros"
            actions={(branch) => (
              <>
                <button type="button" onClick={() => form.startEdit(branch)}>
                  Editar
                </button>
                {branch.active ? (
                  <button
                    type="button"
                    className="button-danger"
                    onClick={() => controller.deactivate(branch.id)}
                  >
                    Desactivar
                  </button>
                ) : (
                  <button type="button" onClick={() => controller.reactivate(branch.id)}>
                    Reactivar
                  </button>
                )}
              </>
            )}
          />
        </div>
      </AsyncBoundary>

      {form.visible.value && (
        <Modal title={form.isEditing ? 'Editar sucursal' : 'Nueva sucursal'} onClose={form.close}>
          <EntityForm
            controller={form}
            submitLabel={form.isEditing ? 'Guardar cambios' : 'Crear sucursal'}
            fields={FIELDS}
          />
        </Modal>
      )}
    </main>
  );
}
