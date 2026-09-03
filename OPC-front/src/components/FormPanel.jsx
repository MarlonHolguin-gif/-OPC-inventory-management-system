import { Alert } from '@/components/Alert';

/**
 * Cuerpo de un formulario CRUD: los campos (children), la alerta de error del
 * envío y la fila de acciones (enviar y, opcional, cancelar). El título y el
 * cierre los pone la <Modal> que lo contiene.
 *
 * `error` se pinta aquí dentro (no en el `GlobalAlert` del layout, que el
 * modal taparía).
 */
export function FormPanel({
  onSubmit,
  submitLabel,
  submitting = false,
  onCancel,
  cancelLabel = 'Cancelar',
  error,
  children,
}) {
  return (
    <form onSubmit={onSubmit} noValidate>
      {children}

      <Alert tone="error">{error}</Alert>

      <div className="form-actions">
        <button type="submit" disabled={submitting}>
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel}>
            {cancelLabel}
          </button>
        )}
      </div>
    </form>
  );
}
