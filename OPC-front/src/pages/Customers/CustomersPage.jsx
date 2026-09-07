import { useController } from '@/lib/useController';
import { DataTable } from '@/components/DataTable';
import { AsyncBoundary } from '@/components/AsyncBoundary';
import { EntityForm } from '@/components/EntityForm';
import { Modal } from '@/components/Modal';
import { FilterBar, FilterField } from '@/components/FilterBar';
import { TextField, SelectField } from '@/components/Field';
import { CustomersController } from './CustomersController';
import './Customers.css';

function documentOf(customer) {
  if (!customer.documentType && !customer.documentNumber) return '—';
  return `${customer.documentType ?? ''} ${customer.documentNumber ?? ''}`.trim();
}

const COLUMNS = [
  { key: 'name', header: 'Nombre' },
  { key: 'document', header: 'Documento', render: documentOf },
  { key: 'phone', header: 'Teléfono' },
  { key: 'email', header: 'Correo' },
  { key: 'active', header: 'Estado', render: (c) => (c.active ? 'Activo' : 'Inactivo') },
];

const FIELDS = [
  { key: 'name', label: 'Nombre', required: true },
  { key: 'documentType', label: 'Tipo de documento', placeholder: 'ej. CC, NIT' },
  { key: 'documentNumber', label: 'Número de documento' },
  { key: 'phone', label: 'Teléfono' },
  { key: 'email', label: 'Correo' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
];

export default function CustomersPage() {
  const controller = useController(CustomersController);
  const form = controller.form;
  const filter = controller.filter;
  const draft = filter.draft.value;

  return (
    <main className="customers-page">
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
            label="Documento"
            value={draft.document}
            onChange={(value) => filter.set('document', value)}
            placeholder="Tipo o número"
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
          + Nuevo cliente
        </button>
      </FilterBar>

      <AsyncBoundary loading={controller.loading.value}>
        <div className="customers-table-card">
          <DataTable
            columns={COLUMNS}
            rows={controller.filtered.value}
            empty="No hay clientes que coincidan con los filtros"
            actions={(customer) => (
              <>
                <button type="button" onClick={() => form.startEdit(customer)}>
                  Editar
                </button>
                {customer.active ? (
                  <button
                    type="button"
                    className="button-danger"
                    onClick={() => controller.deactivate(customer.id)}
                  >
                    Desactivar
                  </button>
                ) : (
                  <button type="button" onClick={() => controller.reactivate(customer.id)}>
                    Reactivar
                  </button>
                )}
              </>
            )}
          />
        </div>
      </AsyncBoundary>

      {form.visible.value && (
        <Modal title={form.isEditing ? 'Editar cliente' : 'Nuevo cliente'} onClose={form.close}>
          <EntityForm
            controller={form}
            submitLabel={form.isEditing ? 'Guardar cambios' : 'Crear cliente'}
            fields={FIELDS}
          />
        </Modal>
      )}
    </main>
  );
}
