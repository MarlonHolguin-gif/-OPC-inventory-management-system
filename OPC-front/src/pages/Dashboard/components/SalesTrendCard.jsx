import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DashboardCard } from './DashboardCard';
import { ChartTooltip } from './ChartTooltip';
import { SERIES_1, MUTED, GRID, axisTickStyle, formatNumber, monthLabel } from '../constants';

const TITLE = 'Ventas: mes en curso vs. anteriores';

export function SalesTrendCard({ salesTrend }) {
  const data = salesTrend?.map((point) => ({ ...point, label: monthLabel(point.month) })) ?? [];
  const hasData = data.some((point) => Number(point.total) > 0);

  // Sin datos aún: solo el mensaje, nunca una gráfica vacía con ejes.
  if (salesTrend && !hasData) {
    return (
      <DashboardCard title={TITLE} bare>
        <p className="kpi-empty">No hay información que mostrar</p>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard title={TITLE} loading={!salesTrend} bare>
      <div className="kpi-chart-fill">
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
