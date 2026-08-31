import { useId } from 'react';

/**
 * Campos de formulario controlados. Cada uno pinta su `<label>` + control y
 * llama `onChange(nextValue)` con el valor ya desempaquetado del evento.
 */

export function TextField({ id, label, value, onChange, type = 'text', ...rest }) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <>
      <label htmlFor={fieldId}>{label}</label>
      <input
        id={fieldId}
        type={type}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        {...rest}
      />
    </>
  );
}

export function SelectField({ id, label, value, onChange, options, placeholder = '— elegir —', ...rest }) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <>
      <label htmlFor={fieldId}>{label}</label>
      <select id={fieldId} value={value ?? ''} onChange={(event) => onChange(event.target.value)} {...rest}>
        {placeholder !== null && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </>
  );
}

export function CheckboxField({ id, label, checked, onChange, ...rest }) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <label htmlFor={fieldId}>
      <input
        id={fieldId}
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(event) => onChange(event.target.checked)}
        {...rest}
      />
      {label}
    </label>
  );
}
