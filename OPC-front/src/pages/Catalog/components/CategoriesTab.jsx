import { DataTable } from '@/components/DataTable';
import { CrudToolbar } from '@/components/CrudToolbar';
import { FormPanel } from '@/components/FormPanel';
import { Modal } from '@/components/Modal';
import { TextField } from '@/components/Field';

const COLUMNS = [
  { key: 'name', header: 'Nombre' },
  { key: 'description', header: 'Descripción' },
  { key: 'active', header: 'Estado', render: (row) => (row.active ? 'Activa' : 'Inactiva') },
];

export function CategoriesTab({ controller }) {
  const form = controller.categoryForm;
  const values = form.form.value;

  return (
    <section>
      <DataTable
        columns={COLUMNS}
        rows={controller.categories.value}
        empty="No hay categorías."
        actions={(category) => (
          <>
            <button type="button" onClick={() => form.startEdit(category)}>
              Editar
            </button>
            {category.active ? (
              <button type="button" onClick={() => form.deactivate(category.id)}>
                Desactivar
              </button>
            ) : (
              <button type="button" onClick={() => form.reactivate(category.id)}>
                Reactivar
              </button>
            )}
          </>
        )}
      />

      <CrudToolbar label="Nueva categoría" onCreate={form.openCreate} />

      {form.visible.value && (
        <Modal title={form.isEditing ? 'Editar categoría' : 'Nueva categoría'} onClose={form.close}>
          <FormPanel
            submitLabel={form.isEditing ? 'Guardar cambios' : 'Crear categoría'}
            submitting={form.submitting.value}
            onSubmit={(event) => form.submit(event)}
            onCancel={form.close}
          >
            <TextField
              label="Nombre"
              value={values.name}
              onChange={(value) => form.setField('name', value)}
              required
            />
            <TextField
              label="Descripción"
              value={values.description}
              onChange={(value) => form.setField('description', value)}
            />
          </FormPanel>
        </Modal>
      )}
    </section>
  );
}
