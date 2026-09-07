import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DashboardCard } from './DashboardCard';
import { ChartTooltip } from './ChartTooltip';
import {
  SERIES_1,
  SERIES_2,
  GRID,
  TEXT_DIM,
  axisTickStyle,
  formatNumber,
  transferStatusLabel,
} from '../constants';

export function TransfersImpactCard({ transfersImpact }) {
  const isEmpty =
    transfersImpact &&
    !transfersImpact.activeTransfersAsOrigin &&
    !transfersImpact.activeTransfersAsDestination &&
    transfersImpact.byProduct.length === 0;

  return (
    <DashboardCard title="Transferencias activas y su impacto" loading={!transfersImpact} bare>
      {isEmpty && <p className="kpi-empty">No hay información que mostrar</p>}

      {transfersImpact && !isEmpty && (
        <>
          <div className="stat-inline">
            <span>
              Como sucursal origen <strong>{transfersImpact.activeTransfersAsOrigin}</strong>
            </span>
            <span>
              Como sucursal destino <strong>{transfersImpact.activeTransfersAsDestination}</strong>
            </span>
          </div>

          {transfersImpact.statusBreakdown.length > 0 && (
            <ul className="transfer-status-breakdown">
              {transfersImpact.statusBreakdown.map((entry) => (
                <li key={entry.status}>
                  <span>{transferStatusLabel(entry.status)}</span>
                  <strong>{entry.count}</strong>
                </li>
              ))}
            </ul>
          )}

          {transfersImpact.byProduct.length === 0 ? (
            <p>Sin impacto por producto para mostrar.</p>
          ) : (
            <div className="kpi-chart-fill">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={transfersImpact.byProduct} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid stroke={GRID} horizontal={false} />
                  <XAxis
                    type="number"
                    tick={axisTickStyle}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={formatNumber}
                  />
                  <YAxis
                    type="category"
                    dataKey="productSku"
                    tick={axisTickStyle}
                    axisLine={false}
                    tickLine={false}
                    width={78}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--surface-hover)' }} />
                  <Legend wrapperStyle={{ fontSize: 12.5, color: TEXT_DIM }} />
                  <Bar
                    dataKey="projectedOutbound"
                    name="Sale (origen)"
                    fill={SERIES_1}
                    radius={[0, 4, 4, 0]}
                    maxBarSize={16}
                  />
                  <Bar
                    dataKey="projectedInbound"
                    name="Entra (destino)"
                    fill={SERIES_2}
                    radius={[0, 4, 4, 0]}
                    maxBarSize={16}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </DashboardCard>
  );
}
