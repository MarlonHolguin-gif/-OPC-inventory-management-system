import { FormPanel } from '@/components/FormPanel';
import { TextField } from '@/components/Field';
import { PasswordField } from '@/components/PasswordField';

/**
 * Formulario CRUD declarativo para entidades de campos simples. Se usa
 * dentro de una <Modal> (que pone título y cierre).
 *
 *   fields: [{ key, label, type?, required?, placeholder?, disabledOnEdit? }]
 *
 * `controller` es un FormController (form/isEditing/setField/submit/close).
 */
export function EntityForm({ controller, submitLabel, fields }) {
  const values = controller.form.value;

  return (
    <FormPanel
      submitLabel={submitLabel}
      submitting={controller.submitting.value}
      onSubmit={(event) => controller.submit(event)}
      onCancel={controller.close}
      cancelLabel="Cancelar"
    >
      {fields.map((field) => {
        const common = {
          label: field.label,
          value: values[field.key],
          onChange: (value) => controller.setField(field.key, value),
          required: field.required,
          placeholder: field.placeholder,
        };
        if (field.type === 'password') {
          return <PasswordField key={field.key} {...common} minLength={field.minLength} />;
        }
        return (
          <TextField
            key={field.key}
            {...common}
            type={field.type ?? 'text'}
            disabled={field.disabledOnEdit && controller.isEditing}
          />
        );
      })}
    </FormPanel>
  );
}
