import { useController } from '@/lib/useController';
import { DataTable } from '@/components/DataTable';
import { AsyncBoundary } from '@/components/AsyncBoundary';
import { EntityForm } from '@/components/EntityForm';
import { Modal } from '@/components/Modal';
import { FilterBar, FilterField } from '@/components/FilterBar';
import { TextField, SelectField } from '@/components/Field';
import { SuppliersController } from './SuppliersController';
import './Suppliers.css';

const COLUMNS = [
  { key: 'name', header: 'Nombre' },
  { key: 'taxId', header: 'NIT' },
  { key: 'contact', header: 'Contacto' },
  { key: 'active', header: 'Estado', render: (s) => (s.active ? 'Activo' : 'Inactivo') },
];

const FIELDS = [
  { key: 'name', label: 'Nombre', required: true },
  { key: 'taxId', label: 'NIT o identificación tributaria' },
  { key: 'contact', label: 'Contacto' },
  { key: 'phone', label: 'Teléfono' },
  { key: 'email', label: 'Correo' },
  { key: 'address', label: 'Dirección' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
];

export default function SuppliersPage() {
  const controller = useController(SuppliersController);
  const form = controller.form;
  const filter = controller.filter;
  const draft = filter.draft.value;

  return (
    <main className="suppliers-page">
      <FilterBar onSubmit={filter.apply}>
        <FilterField>
          <TextField
            label="Nombre"
            value={draft.name}
            onChange={(value) => filter.set('name', value)}
            placeholder="Filtra los resultados"
          />
        </FilterField>
        <FilterField>
          <TextField
            label="Contacto"
            value={draft.contact}
            onChange={(value) => filter.set('contact', value)}
            placeholder="Filtra los resultados"
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
          + Nuevo proveedor
        </button>
      </FilterBar>

      <AsyncBoundary loading={controller.loading.value}>
        <div className="suppliers-table-card">
          <DataTable
            columns={COLUMNS}
            rows={controller.filtered.value}
            empty="No hay proveedores que coincidan con los filtros"
            actions={(supplier) => (
              <>
                <button type="button" onClick={() => form.startEdit(supplier)}>
                  Editar
                </button>
                {supplier.active ? (
                  <button
                    type="button"
                    className="button-danger"
                    onClick={() => controller.deactivate(supplier.id)}
                  >
                    Desactivar
                  </button>
                ) : (
                  <button type="button" onClick={() => controller.reactivate(supplier.id)}>
                    Reactivar
                  </button>
                )}
              </>
            )}
          />
        </div>
      </AsyncBoundary>

      {form.visible.value && (
        <Modal title={form.isEditing ? 'Editar proveedor' : 'Nuevo proveedor'} onClose={form.close}>
          <EntityForm
            controller={form}
            submitLabel={form.isEditing ? 'Guardar cambios' : 'Crear proveedor'}
            fields={FIELDS}
          />
        </Modal>
      )}
    </main>
  );
}
