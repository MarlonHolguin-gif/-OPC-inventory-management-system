/**
 * Sección del panel. Mientras `loading` (dato aún null) no pinta nada.
 *  - normal: es su propia tarjeta (.panel-card).
 *  - `bare`: tarjeta propia dentro de la grilla de 4 KPIs de arriba — mismo
 *    marco que las demás, pero con los ajustes de la grilla (.dashboard-kpi).
 *  - `wide`: ocupa todo el ancho de la grilla.
 */
export function DashboardCard({ title, loading = false, wide = false, bare = false, children }) {
  const className = bare
    ? 'panel-card dashboard-kpi'
    : `panel-card${wide ? ' dashboard-section-wide' : ''}`;

  return (
    <section className={className}>
      <h2>{title}</h2>
      {loading ? null : children}
    </section>
  );
}
