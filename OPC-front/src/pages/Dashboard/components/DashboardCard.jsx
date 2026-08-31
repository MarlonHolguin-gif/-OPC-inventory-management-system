/**
 * Sección del panel. `loading` (dato aún null) muestra "Cargando…".
 *  - normal: es su propia tarjeta (.panel-card).
 *  - `bare`: sin marco propio — para usarse dentro de una tarjeta contenedora
 *    (la grilla de KPIs de arriba, que va toda en un mismo layout).
 *  - `wide`: ocupa todo el ancho de la grilla.
 */
export function DashboardCard({ title, loading = false, wide = false, bare = false, children }) {
  const className = bare
    ? 'dashboard-kpi'
    : `panel-card${wide ? ' dashboard-section-wide' : ''}`;
  const Tag = bare ? 'div' : 'section';

  return (
    <Tag className={className}>
      <h2>{title}</h2>
      {loading ? <p>Cargando…</p> : children}
    </Tag>
  );
}
