import { FormPanel } from '@/components/FormPanel';
import { TextField } from '@/components/Field';

export function PriceListForm({ form }) {
  const values = form.form.value;

  // "Vigente hasta" nunca antes de "Vigente desde".
  const setStartDate = (value) => {
    form.setField('startDate', value);
    if (value && values.endDate && values.endDate < value) form.setField('endDate', value);
  };
  const setEndDate = (value) => {
    if (value && values.startDate && value < values.startDate) return;
    form.setField('endDate', value);
  };

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
        max={values.endDate || undefined}
        onChange={setStartDate}
      />
      <TextField
        label="Vigente hasta"
        type="date"
        value={values.endDate}
        min={values.startDate || undefined}
        onChange={setEndDate}
      />
    </FormPanel>
  );
}
