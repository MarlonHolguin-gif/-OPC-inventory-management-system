import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DashboardCard } from './DashboardCard';
import { ChartTooltip } from './ChartTooltip';
import { SERIES_1, GRID, axisTickStyle, formatNumber, horizontalBarHeight } from '../constants';

export function RotationCard({ rotation }) {
  return (
    <DashboardCard title="Rotación de inventario" loading={!rotation} bare>
      {rotation?.length === 0 ? (
        <p>No hay ventas registradas en esta sucursal para calcular rotación.</p>
      ) : (
        <ResponsiveContainer width="100%" height={horizontalBarHeight(rotation?.length ?? 0)}>
          <BarChart data={rotation ?? []} layout="vertical" margin={{ left: 8 }}>
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
            <Bar
              dataKey="quantitySold"
              name="Cantidad vendida"
              fill={SERIES_1}
              radius={[0, 4, 4, 0]}
              maxBarSize={22}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </DashboardCard>
  );
}
