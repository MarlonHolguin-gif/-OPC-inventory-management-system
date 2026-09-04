import { useController } from '@/lib/useController';
import { DataTable } from '@/components/DataTable';
import { CrudToolbar } from '@/components/CrudToolbar';
import { AsyncBoundary } from '@/components/AsyncBoundary';
import { SearchBar } from '@/components/SearchBar';
import { EntityForm } from '@/components/EntityForm';
import { Modal } from '@/components/Modal';
import { SuppliersController } from './SuppliersController';

const COLUMNS = [
  { key: 'name', header: 'Nombre' },
  { key: 'taxId', header: 'tax_id' },
  { key: 'contact', header: 'Contacto' },
  { key: 'active', header: 'Estado', render: (s) => (s.active ? 'Activo' : 'Inactivo') },
];

const FIELDS = [
  { key: 'name', label: 'Nombre', required: true },
  { key: 'taxId', label: 'NIT / tax_id' },
  { key: 'contact', label: 'Contacto' },
  { key: 'phone', label: 'Teléfono' },
  { key: 'email', label: 'Correo' },
  { key: 'address', label: 'Dirección' },
];

export default function SuppliersPage() {
  const controller = useController(SuppliersController);
  const form = controller.form;

  return (
    <main>
      <h1>Proveedores</h1>

      <SearchBar
        value={controller.search.value}
        onChange={controller.setSearch}
        placeholder="Buscar por nombre…"
        label="Buscar proveedor"
      />

      <AsyncBoundary variant="screen" loading={controller.loading.value}>
        <DataTable
          columns={COLUMNS}
          rows={controller.filtered.value}
          empty="No hay proveedores."
          actions={(supplier) => (
            <>
              <button type="button" onClick={() => form.startEdit(supplier)}>
                Editar
              </button>
              {supplier.active ? (
                <button type="button" onClick={() => controller.deactivate(supplier.id)}>
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

        <CrudToolbar label="Nuevo proveedor" onCreate={form.openCreate} />

        {form.visible.value && (
          <Modal title={form.isEditing ? 'Editar proveedor' : 'Nuevo proveedor'} onClose={form.close}>
            <EntityForm
              controller={form}
              submitLabel={form.isEditing ? 'Guardar cambios' : 'Crear proveedor'}
              fields={FIELDS}
            />
          </Modal>
        )}
      </AsyncBoundary>
    </main>
  );
}
