// Gráfica de barras agrupadas (sucursal origen × prioridad de ruta) para el
// reporte de cumplimiento logístico. Construida a mano en SVG — sin
// librería de gráficas — siguiendo el skill dataviz: paleta categórica
// validada contra daltonismo/contraste (ver --chart-low/medium/high en
// index.css), barras con esquina superior redondeada y base cuadrada,
// etiqueta directa de valor, leyenda solo si hay 2+ series presentes, y un
// <title> por barra como tooltip nativo accesible.

import { routePriorityLabel } from '../constants';

const PRIORITY_ORDER = ['LOW', 'MEDIUM', 'HIGH'];
const PRIORITY_VARS = { LOW: 'var(--chart-low)', MEDIUM: 'var(--chart-medium)', HIGH: 'var(--chart-high)' };

const BAR_WIDTH = 22;
const BAR_GAP = 4;
const GROUP_GAP = 30;
const CHART_HEIGHT = 200;
const LEFT_AXIS_WIDTH = 36;
const TOP_PADDING = 22;
const BOTTOM_AXIS_HEIGHT = 30;
const CORNER_RADIUS = 4;

// Path de una barra con solo las esquinas superiores redondeadas (una
// esquina redondeada completa en las 4 puntas, vía <rect rx>, dejaría la
// base "flotando" en vez de plantada en la línea base).
function roundedTopBarPath(x, yTop, width, height) {
  const r = Math.max(0, Math.min(CORNER_RADIUS, height, width / 2));
  if (height <= 0) return '';
  if (r === 0) return `M ${x},${yTop} h ${width} v ${height} h ${-width} Z`;
  return `M ${x},${yTop + r}
    A ${r},${r} 0 0 1 ${x + r},${yTop}
    H ${x + width - r}
    A ${r},${r} 0 0 1 ${x + width},${yTop + r}
    V ${yTop + height}
    H ${x}
    Z`;
}

export function ComplianceBarChart({ rows, branchCodes, branchNames }) {
  const branchIds = [...new Set(rows.map((row) => row.originBranchId))].sort((a, b) =>
    (branchNames[a] ?? '').localeCompare(branchNames[b] ?? ''),
  );
  const presentPriorities = PRIORITY_ORDER.filter((priority) => rows.some((row) => row.routePriority === priority));

  if (branchIds.length === 0 || presentPriorities.length === 0) {
    return <p>No hay transferencias recibidas (con fecha estimada) en este rango para graficar.</p>;
  }

  const groupWidth = presentPriorities.length * BAR_WIDTH + (presentPriorities.length - 1) * BAR_GAP;
  const width = LEFT_AXIS_WIDTH + branchIds.length * (groupWidth + GROUP_GAP);
  const height = TOP_PADDING + CHART_HEIGHT + BOTTOM_AXIS_HEIGHT;
  const yFor = (pct) => TOP_PADDING + CHART_HEIGHT - (pct / 100) * CHART_HEIGHT;

  return (
    <div className="compliance-chart-wrap">
      {presentPriorities.length > 1 && (
        <ul className="chart-legend">
          {presentPriorities.map((priority) => (
            <li key={priority}>
              <span className="legend-swatch" style={{ background: PRIORITY_VARS[priority] }} />
              Prioridad {routePriorityLabel(priority)}
            </li>
          ))}
        </ul>
      )}

      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        className="compliance-chart"
        role="img"
        aria-label="Porcentaje de transferencias a tiempo por sucursal origen y prioridad de ruta"
      >
        {[0, 25, 50, 75, 100].map((tick) => (
          <g key={tick}>
            <line x1={LEFT_AXIS_WIDTH} x2={width} y1={yFor(tick)} y2={yFor(tick)} className="chart-gridline" />
            <text x={LEFT_AXIS_WIDTH - 8} y={yFor(tick)} className="chart-axis-label" textAnchor="end" dominantBaseline="middle">
              {tick}%
            </text>
          </g>
        ))}
        <line
          x1={LEFT_AXIS_WIDTH}
          x2={width}
          y1={TOP_PADDING + CHART_HEIGHT}
          y2={TOP_PADDING + CHART_HEIGHT}
          className="chart-baseline"
        />

        {branchIds.map((branchId, groupIndex) => {
          const groupX = LEFT_AXIS_WIDTH + groupIndex * (groupWidth + GROUP_GAP) + GROUP_GAP / 2;
          return (
            <g key={branchId}>
              <text x={groupX + groupWidth / 2} y={TOP_PADDING + CHART_HEIGHT + 20} className="chart-axis-label" textAnchor="middle">
                {branchCodes[branchId] ?? `#${branchId}`}
              </text>
              {presentPriorities.map((priority, i) => {
                const row = rows.find((r) => r.originBranchId === branchId && r.routePriority === priority);
                if (!row) return null;
                const barX = groupX + i * (BAR_WIDTH + BAR_GAP);
                const barTopY = yFor(row.onTimePercentage);
                const barHeight = TOP_PADDING + CHART_HEIGHT - barTopY;
                return (
                  <g key={priority} className="chart-bar-group" tabIndex={0}>
                    <title>
                      {`${branchNames[branchId] ?? branchId} — Prioridad ${routePriorityLabel(priority)}: ` +
                        `${row.onTimePercentage}% a tiempo (${row.onTimeTransfers} de ${row.totalTransfers})`}
                    </title>
                    <path d={roundedTopBarPath(barX, barTopY, BAR_WIDTH, barHeight)} className="chart-bar" style={{ fill: PRIORITY_VARS[priority] }} />
                    <text x={barX + BAR_WIDTH / 2} y={barTopY - 6} textAnchor="middle" className="chart-bar-label">
                      {row.onTimePercentage}%
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
