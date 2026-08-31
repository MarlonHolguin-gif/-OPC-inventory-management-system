/**
 * Envoltura para los estados de carga/vacío de una vista. Reemplaza el
 * `if (loading) return <main>Cargando…</main>` copiado en cada página.
 *
 *   <AsyncBoundary loading={c.loading.value}>
 *     ...contenido...
 *   </AsyncBoundary>
 */
export function AsyncBoundary({ loading, loadingText = 'Cargando…', children }) {
  if (loading) return <p>{loadingText}</p>;
  return children;
}
