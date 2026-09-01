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
  horizontalBarHeight,
  transferStatusLabel,
} from '../constants';

export function TransfersImpactCard({ transfersImpact }) {
  return (
    <DashboardCard title="Transferencias activas y su impacto" loading={!transfersImpact} bare>
      {transfersImpact && (
        <>
          <div className="stat-row">
            <div className="stat-tile">
              <span className="stat-label">Como sucursal origen</span>
              <span className="stat-value">{transfersImpact.activeTransfersAsOrigin}</span>
            </div>
            <div className="stat-tile">
              <span className="stat-label">Como sucursal destino</span>
              <span className="stat-value">{transfersImpact.activeTransfersAsDestination}</span>
            </div>
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
            <p>No hay transferencias activas que involucren esta sucursal.</p>
          ) : (
            <ResponsiveContainer width="100%" height={horizontalBarHeight(transfersImpact.byProduct.length)}>
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
          )}
        </>
      )}
    </DashboardCard>
  );
}
