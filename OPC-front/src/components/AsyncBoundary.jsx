/**
 * Envoltura para el estado de carga de una vista. Mientras los datos llegan
 * no se pinta nada (sin pantalla de carga). Cuando ya cargó, muestra
 * `children`.
 *
 *   <AsyncBoundary loading={c.loading.value}>
 *     ...contenido...
 *   </AsyncBoundary>
 */
export function AsyncBoundary({ loading, children }) {
  if (loading) {
    return null;
  }
  return children;
}
