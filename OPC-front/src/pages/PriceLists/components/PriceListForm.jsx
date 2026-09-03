import { FormPanel } from '@/components/FormPanel';
import { TextField } from '@/components/Field';

export function PriceListForm({ form }) {
  const values = form.form.value;

  return (
    <FormPanel
      submitLabel={form.isEditing ? 'Guardar cambios' : 'Crear lista'}
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
        label="Descripción"
        value={values.description}
        onChange={(value) => form.setField('description', value)}
      />
      <TextField
        label="Vigente desde"
        type="date"
        value={values.startDate}
        onChange={(value) => form.setField('startDate', value)}
      />
      <TextField
        label="Vigente hasta"
        type="date"
        value={values.endDate}
        onChange={(value) => form.setField('endDate', value)}
      />
    </FormPanel>
  );
}
