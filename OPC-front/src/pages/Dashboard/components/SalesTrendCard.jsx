import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DashboardCard } from './DashboardCard';
import { ChartTooltip } from './ChartTooltip';
import { SERIES_1, MUTED, GRID, axisTickStyle, formatNumber, monthLabel } from '../constants';

export function SalesTrendCard({ salesTrend }) {
  const data = salesTrend?.map((point) => ({ ...point, label: monthLabel(point.month) })) ?? [];

  return (
    <DashboardCard title="Ventas: mes en curso vs. anteriores" loading={!salesTrend} bare>
      {/* La gráfica ocupa toda la altura disponible del card (se estira para
          igualar la altura de su vecino en la fila de la grilla). */}
      <div className="dashboard-chart-fill">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="label" tick={axisTickStyle} axisLine={{ stroke: GRID }} tickLine={false} />
            <YAxis
              tick={axisTickStyle}
              axisLine={false}
              tickLine={false}
              width={64}
              tickFormatter={formatNumber}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--surface-hover)' }} />
            <Bar dataKey="total" name="Ventas" radius={[4, 4, 0, 0]} maxBarSize={56}>
              {data.map((entry, index) => (
                <Cell key={entry.month} fill={index === data.length - 1 ? SERIES_1 : MUTED} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </DashboardCard>
  );
}
