import { useId, useState } from 'react';
import { EyeIcon, EyeOffIcon } from '@/components/icons/UtilityIcons';
import './PasswordField.css';

/**
 * Campo de contraseña con botón para mostrar/ocultar. Controlado: llama
 * `onChange(nextValue)`.
 */
export function PasswordField({ id, label, value, onChange, ...rest }) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const [visible, setVisible] = useState(false);

  return (
    <>
      <label htmlFor={fieldId}>{label}</label>
      <div className="input-with-action">
        <input
          id={fieldId}
          type={visible ? 'text' : 'password'}
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
          {...rest}
        />
        <button
          type="button"
          className="input-action"
          onClick={() => setVisible((current) => !current)}
          aria-pressed={visible}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </>
  );
}
