import { LoadingScreen } from './LoadingScreen';

/**
 * Envoltura para el estado de carga de una vista. Reemplaza el
 * `if (loading) return <main>Cargando…</main>` copiado en cada página.
 *
 *   <AsyncBoundary loading={c.loading.value}>
 *     ...contenido...
 *   </AsyncBoundary>
 *
 * - `variant="inline"` (por defecto): un texto discreto, para sub-paneles y
 *   formularios dentro de un modal.
 * - `variant="screen"`: la pantalla de carga con la marca de OPI a pantalla
 *   completa, para el contenido principal de una ruta.
 */
export function AsyncBoundary({ loading, loadingText = 'Cargando…', variant = 'inline', children }) {
  if (loading) {
    return variant === 'screen' ? <LoadingScreen text={loadingText} /> : <p>{loadingText}</p>;
  }
  return children;
}
