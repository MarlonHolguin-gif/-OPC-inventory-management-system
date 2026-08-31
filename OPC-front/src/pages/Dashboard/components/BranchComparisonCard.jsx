import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DashboardCard } from './DashboardCard';
import { ChartTooltip } from './ChartTooltip';
import { SERIES_1, SERIES_2, SERIES_3, GRID, TEXT_DIM, axisTickStyle, formatNumber } from '../constants';

export function BranchComparisonCard({ comparison }) {
  return (
    <DashboardCard title="Comparativa entre sucursales" loading={!comparison} wide>
      <div className="dashboard-comparison-charts">
        <div>
          <h3>Ventas del mes por sucursal</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={comparison ?? []}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="branchName" tick={axisTickStyle} axisLine={{ stroke: GRID }} tickLine={false} />
              <YAxis
                tick={axisTickStyle}
                axisLine={false}
                tickLine={false}
                width={64}
                tickFormatter={formatNumber}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--surface-hover)' }} />
              <Bar
                dataKey="currentMonthSales"
                name="Ventas del mes"
                fill={SERIES_1}
                radius={[4, 4, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div>
          <h3>Alertas de stock y transferencias activas</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={comparison ?? []}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="branchName" tick={axisTickStyle} axisLine={{ stroke: GRID }} tickLine={false} />
              <YAxis allowDecimals={false} tick={axisTickStyle} axisLine={false} tickLine={false} width={40} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--surface-hover)' }} />
              <Legend wrapperStyle={{ fontSize: 12.5, color: TEXT_DIM }} />
              <Bar
                dataKey="lowStockProductsCount"
                name="Productos en alerta"
                fill={SERIES_1}
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
              <Bar
                dataKey="activeTransfersAsOrigin"
                name="Transf. como origen"
                fill={SERIES_2}
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
              <Bar
                dataKey="activeTransfersAsDestination"
                name="Transf. como destino"
                fill={SERIES_3}
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </DashboardCard>
  );
}
