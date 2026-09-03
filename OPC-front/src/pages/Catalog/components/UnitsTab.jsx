import { DataTable } from '@/components/DataTable';
import { CrudToolbar } from '@/components/CrudToolbar';
import { FormPanel } from '@/components/FormPanel';
import { Modal } from '@/components/Modal';
import { TextField } from '@/components/Field';

const COLUMNS = [
  { key: 'name', header: 'Nombre' },
  { key: 'abbreviation', header: 'Abreviatura' },
  { key: 'active', header: 'Estado', render: (unit) => (unit.active ? 'Activa' : 'Inactiva') },
];

export function UnitsTab({ controller }) {
  const form = controller.unitForm;
  const values = form.form.value;

  return (
    <section>
      <DataTable
        columns={COLUMNS}
        rows={controller.units.value}
        empty="No hay unidades de medida."
        actions={(unit) => (
          <>
            <button type="button" onClick={() => form.startEdit(unit)}>
              Editar
            </button>
            {unit.active ? (
              <button type="button" onClick={() => form.deactivate(unit.id)}>
                Desactivar
              </button>
            ) : (
              <button type="button" onClick={() => form.reactivate(unit.id)}>
                Reactivar
              </button>
            )}
            <button type="button" onClick={() => form.remove(unit)}>
              Eliminar
            </button>
          </>
        )}
      />

      <CrudToolbar label="Nueva unidad de medida" onCreate={form.openCreate} />

      {form.visible.value && (
        <Modal
          title={form.isEditing ? 'Editar unidad' : 'Nueva unidad de medida'}
          onClose={form.close}
        >
          <FormPanel
            submitLabel={form.isEditing ? 'Guardar cambios' : 'Crear unidad'}
            submitting={form.submitting.value}
            onSubmit={(event) => form.submit(event)}
            onCancel={form.close}
            error={form.error.value}
          >
            <TextField
              label="Nombre"
              value={values.name}
              onChange={(value) => form.setField('name', value)}
              required
            />
            <TextField
              label="Abreviatura"
              value={values.abbreviation}
              onChange={(value) => form.setField('abbreviation', value)}
              required
            />
          </FormPanel>
        </Modal>
      )}
    </section>
  );
}
