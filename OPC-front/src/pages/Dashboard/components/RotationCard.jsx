import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DashboardCard } from './DashboardCard';
import { ChartTooltip } from './ChartTooltip';
import { SERIES_1, GRID, axisTickStyle, formatNumber } from '../constants';

const MAX_ROWS = 8;

export function RotationCard({ controller }) {
  const rotation = controller.rotation.value;
  const order = controller.rotationOrder.value;
  const shown = rotation ? rotation.slice(0, MAX_ROWS) : [];
  const total = rotation?.length ?? 0;

  return (
    <DashboardCard title="Rotación de inventario" loading={!rotation} bare>
      <div className="rotation-controls">
        <div className="rotation-toggle" role="group" aria-label="Ordenar por demanda">
          <button
            type="button"
            className={order === 'DESC' ? 'is-active' : ''}
            onClick={() => controller.setRotationOrder('DESC')}
          >
            Alta demanda
          </button>
          <button
            type="button"
            className={order === 'ASC' ? 'is-active' : ''}
            onClick={() => controller.setRotationOrder('ASC')}
          >
            Baja demanda
          </button>
        </div>
        <label>
          Desde
          <input
            type="date"
            value={controller.rotationFrom.value}
            max={controller.rotationTo.value || undefined}
            onChange={(event) => controller.setRotationFrom(event.target.value)}
          />
        </label>
        <label>
          Hasta
          <input
            type="date"
            value={controller.rotationTo.value}
            min={controller.rotationFrom.value || undefined}
            onChange={(event) => controller.setRotationTo(event.target.value)}
          />
        </label>
        {/* Siempre en el DOM (visibilidad, no montaje) para que aparecer/
            desaparecer no recoloque los campos de fecha. */}
        <button
          type="button"
          className={`rotation-clear${controller.hasRotationDateFilter.value ? '' : ' is-hidden'}`}
          onClick={controller.clearRotationDates}
        >
          Limpiar fechas
        </button>
      </div>

      {total === 0 ? (
        <p className="kpi-empty">No hay información que mostrar</p>
      ) : (
        <>
          <div className="kpi-chart-fill">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={shown} layout="vertical" margin={{ left: 8 }}>
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
          </div>
          {total > MAX_ROWS && (
            <p className="rotation-caption">
              Mostrando {MAX_ROWS} de {total} productos ({order === 'DESC' ? 'mayor' : 'menor'} demanda).
            </p>
          )}
        </>
      )}
    </DashboardCard>
  );
}
