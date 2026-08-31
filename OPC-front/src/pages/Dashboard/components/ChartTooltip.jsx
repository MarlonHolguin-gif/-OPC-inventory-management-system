import { formatNumber } from '../constants';

/**
 * Tooltip propio (surface + línea de color, no cajas). Si el punto trae
 * `productName` lo usa como título en vez de la etiqueta corta del eje.
 */
export function ChartTooltip({ active, payload, label, formatter = formatNumber }) {
  if (!active || !payload?.length) return null;
  const title = payload[0]?.payload?.productName ?? label;
  return (
    <div className="chart-tooltip">
      <strong>{title}</strong>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="chart-tooltip-row">
          <span className="chart-tooltip-dot" style={{ background: entry.color }} />
          {entry.name}: <strong>{formatter(entry.value)}</strong>
        </div>
      ))}
    </div>
  );
}
