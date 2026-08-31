/**
 * Cuerpo de un formulario CRUD: los campos (children) + la fila de acciones
 * (enviar y, opcional, cancelar). El título y el cierre los pone la <Modal>
 * que lo contiene.
 */
export function FormPanel({
  onSubmit,
  submitLabel,
  submitting = false,
  onCancel,
  cancelLabel = 'Cancelar',
  children,
}) {
  return (
    <form onSubmit={onSubmit} noValidate>
      {children}

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
