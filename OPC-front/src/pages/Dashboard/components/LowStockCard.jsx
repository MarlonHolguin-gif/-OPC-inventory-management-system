import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DataTable } from '@/components/DataTable';
import { DashboardCard } from './DashboardCard';
import { ChartTooltip } from './ChartTooltip';
import { SERIES_1, SERIES_2, GRID, TEXT_DIM, axisTickStyle, formatNumber } from '../constants';

const COLUMNS = [
  { key: 'productSku', header: 'SKU' },
  { key: 'productName', header: 'Producto' },
  { key: 'currentQuantity', header: 'Actual' },
  { key: 'minStock', header: 'Mínimo' },
];

export function LowStockCard({ lowStock }) {
  return (
    <DashboardCard title="Productos próximos a agotarse" loading={!lowStock} bare>
      {lowStock?.length === 0 ? (
        <p className="kpi-empty">No hay información que mostrar</p>
      ) : (
        lowStock && (
          <>
            <div className="kpi-chart-fill">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lowStock} layout="vertical" margin={{ left: 8 }}>
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
                  <Bar dataKey="currentQuantity" name="Actual" fill={SERIES_1} radius={[0, 4, 4, 0]} maxBarSize={16} />
                  <Bar dataKey="minStock" name="Mínimo" fill={SERIES_2} radius={[0, 4, 4, 0]} maxBarSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="kpi-table-scroll">
              <DataTable columns={COLUMNS} rows={lowStock} rowKey={(row) => row.productId} />
            </div>
          </>
        )
      )}
    </DashboardCard>
  );
}
