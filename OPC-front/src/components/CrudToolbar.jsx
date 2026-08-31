/**
 * Fila de acción "+ Nuevo X" que abre el modal de alta.
 */
export function CrudToolbar({ label, onCreate }) {
  return (
    <div className="button-row">
      <button type="button" className="button-link primary" onClick={onCreate}>
        + {label}
      </button>
    </div>
  );
}
