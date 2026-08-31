/**
 * Tabla de datos genérica.
 *
 *   columns: [{ key, header, render?(row), align? }]
 *   rows:    array de objetos
 *   rowKey:  (row, index) => clave única (por defecto row.id)
 *   actions: (row) => ReactNode  — celda final de acciones (opcional)
 *   empty:   texto a mostrar cuando no hay filas
 */
export function DataTable({ columns, rows, rowKey = (row) => row.id, actions, empty = 'No hay registros.' }) {
  if (!rows || rows.length === 0) {
    return <p>{empty}</p>;
  }

  return (
    <table>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.key} style={column.align ? { textAlign: column.align } : undefined}>
              {column.header}
            </th>
          ))}
          {actions && <th aria-label="Acciones" />}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={rowKey(row, index)}>
            {columns.map((column) => (
              <td key={column.key} style={column.align ? { textAlign: column.align } : undefined}>
                {column.render ? column.render(row) : (row[column.key] ?? '—')}
              </td>
            ))}
            {actions && <td>{actions(row)}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
