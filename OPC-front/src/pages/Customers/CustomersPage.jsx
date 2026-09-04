import { useController } from '@/lib/useController';
import { DataTable } from '@/components/DataTable';
import { CrudToolbar } from '@/components/CrudToolbar';
import { AsyncBoundary } from '@/components/AsyncBoundary';
import { SearchBar } from '@/components/SearchBar';
import { EntityForm } from '@/components/EntityForm';
import { Modal } from '@/components/Modal';
import { CustomersController } from './CustomersController';

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

export default function CustomersPage() {
  const controller = useController(CustomersController);
  const form = controller.form;

  return (
    <main>
      <h1>Clientes</h1>

      <SearchBar
        value={controller.search.value}
        onChange={controller.setSearch}
        placeholder="Buscar por nombre…"
        label="Buscar cliente"
      />

      <AsyncBoundary variant="screen" loading={controller.loading.value}>
        <DataTable
          columns={COLUMNS}
          rows={controller.filtered.value}
          empty="No hay clientes."
          actions={(customer) => (
            <>
              <button type="button" onClick={() => form.startEdit(customer)}>
                Editar
              </button>
              {customer.active ? (
                <button type="button" onClick={() => controller.deactivate(customer.id)}>
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

        <CrudToolbar label="Nuevo cliente" onCreate={form.openCreate} />

        {form.visible.value && (
          <Modal title={form.isEditing ? 'Editar cliente' : 'Nuevo cliente'} onClose={form.close}>
            <EntityForm
              controller={form}
              submitLabel={form.isEditing ? 'Guardar cambios' : 'Crear cliente'}
              fields={FIELDS}
            />
          </Modal>
        )}
      </AsyncBoundary>
    </main>
  );
}
