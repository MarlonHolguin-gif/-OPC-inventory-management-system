import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import httpClient from '../api/httpClient';
import { useAuth } from '../hooks/useAuth';

const GENERAL_ADMIN_ROLE = 'GENERAL_ADMIN';

// Paleta categórica validada contra daltonismo/contraste (mismo trío que ya
// usa el reporte de cumplimiento logístico, ver --chart-low/medium/high en
// index.css) — se reutiliza aquí como "serie 1/2/3" genérica en vez de
// prioridad de ruta. Asignación fija por orden de aparición en cada
// gráfica, nunca reordenada según los datos.
const SERIES_1 = 'var(--chart-low)'; // azul
const SERIES_2 = 'var(--chart-high)'; // naranja
const SERIES_3 = 'var(--chart-medium)'; // aqua
const MUTED = 'var(--border)';
const TEXT_DIM = 'var(--text-dim)';
const GRID = 'var(--border)';

const axisTickStyle = { fill: TEXT_DIM, fontSize: 12 };

function formatNumber(value) {
  return Number(value).toLocaleString('es-CO', { maximumFractionDigits: 0 });
}

function monthLabel(month) {
  const [year, monthIndex] = month.split('-').map(Number);
  return new Date(year, monthIndex - 1, 1).toLocaleDateString('es-CO', { month: 'short', year: '2-digit' });
}

// Tooltip propio (surface + línea de color, no cajas) — si el punto trae
// productName (rotación/transferencias/reabastecimiento) lo usa como
// título en vez de la etiqueta corta del eje (SKU).
function ChartTooltip({ active, payload, label, formatter = formatNumber }) {
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

function horizontalBarHeight(count) {
  return Math.max(160, count * 38 + 40);
}

export default function DashboardPage() {
  const { branches: ownBranches, role } = useAuth();
  const isAdmin = role === GENERAL_ADMIN_ROLE;

  const [allBranches, setAllBranches] = useState([]);
  const [branchId, setBranchId] = useState('');

  const [salesTrend, setSalesTrend] = useState(null);
  const [rotation, setRotation] = useState(null);
  const [transfersImpact, setTransfersImpact] = useState(null);
  const [lowStock, setLowStock] = useState(null);
  const [comparison, setComparison] = useState(null);

  const [error, setError] = useState(null);
  const [loadingBranches, setLoadingBranches] = useState(true);

  useEffect(() => {
    if (ownBranches === null) return;
    httpClient
      .get('/api/branches')
      .then(({ data }) => {
        const options = Array.isArray(ownBranches) ? data.filter((branch) => ownBranches.includes(branch.id)) : data;
        setAllBranches(options);
        setBranchId((current) => current || options[0]?.id || '');
      })
      .catch(() => setError('No se pudo cargar la lista de sucursales.'))
      .finally(() => setLoadingBranches(false));
  }, [ownBranches]);

  useEffect(() => {
    if (!branchId) return;
    // setTimeout(0): setError(null) es un setState síncrono al entrar al
    // efecto, y React advierte contra eso — se difiere igual que en
    // TransfersPage.
    const timeoutId = setTimeout(() => {
      setError(null);
      const params = { branchId };
      Promise.all([
        httpClient.get('/api/dashboard/sales-trend', { params }),
        httpClient.get('/api/dashboard/inventory-rotation', { params }),
        httpClient.get('/api/dashboard/active-transfers-impact', { params }),
        httpClient.get('/api/dashboard/low-stock', { params }),
      ])
        .then(([salesRes, rotationRes, transfersRes, lowStockRes]) => {
          setSalesTrend(salesRes.data);
          setRotation(rotationRes.data);
          setTransfersImpact(transfersRes.data);
          setLowStock(lowStockRes.data);
        })
        .catch(() => setError('No se pudo cargar el panel de esta sucursal.'));
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [branchId]);

  useEffect(() => {
    if (!isAdmin) return;
    httpClient
      .get('/api/dashboard/branch-comparison')
      .then(({ data }) => setComparison(data))
      .catch(() => setError('No se pudo cargar la comparativa entre sucursales.'));
  }, [isAdmin]);

  if (loadingBranches) return <main>Cargando…</main>;

  const salesChartData = salesTrend?.map((point) => ({ ...point, label: monthLabel(point.month) })) ?? [];

  return (
    <main>
      <h1>Panel</h1>
      {error && <p role="alert">{error}</p>}

      <label htmlFor="branch">Sucursal</label>
      <select
        id="branch"
        value={branchId}
        onChange={(event) => setBranchId(event.target.value)}
        style={{ maxWidth: 320, marginBottom: 22 }}
      >
        {allBranches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}
          </option>
        ))}
      </select>

      <div className="dashboard-grid">
        {/* 1. Ventas del mes en curso contra los 3 anteriores */}
        <section className="panel-card">
          <h2>Ventas: mes en curso vs. anteriores</h2>
          {!salesTrend ? (
            <p>Cargando…</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={salesChartData}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="label" tick={axisTickStyle} axisLine={{ stroke: GRID }} tickLine={false} />
                <YAxis tick={axisTickStyle} axisLine={false} tickLine={false} width={64} tickFormatter={formatNumber} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--surface-hover)' }} />
                <Bar dataKey="total" name="Ventas" radius={[4, 4, 0, 0]} maxBarSize={56}>
                  {salesChartData.map((entry, index) => (
                    <Cell key={entry.month} fill={index === salesChartData.length - 1 ? SERIES_1 : MUTED} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>

        {/* 2. Rotación de inventario */}
        <section className="panel-card">
          <h2>Rotación de inventario</h2>
          {!rotation ? (
            <p>Cargando…</p>
          ) : rotation.length === 0 ? (
            <p>No hay ventas registradas en esta sucursal para calcular rotación.</p>
          ) : (
            <ResponsiveContainer width="100%" height={horizontalBarHeight(rotation.length)}>
              <BarChart data={rotation} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid stroke={GRID} horizontal={false} />
                <XAxis type="number" tick={axisTickStyle} axisLine={false} tickLine={false} tickFormatter={formatNumber} />
                <YAxis
                  type="category"
                  dataKey="productSku"
                  tick={axisTickStyle}
                  axisLine={false}
                  tickLine={false}
                  width={78}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--surface-hover)' }} />
                <Bar dataKey="quantitySold" name="Cantidad vendida" fill={SERIES_1} radius={[0, 4, 4, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>

        {/* 3. Transferencias activas y su impacto proyectado */}
        <section className="panel-card">
          <h2>Transferencias activas y su impacto</h2>
          {!transfersImpact ? (
            <p>Cargando…</p>
          ) : (
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
              {transfersImpact.byProduct.length === 0 ? (
                <p>No hay transferencias activas que involucren esta sucursal.</p>
              ) : (
                <ResponsiveContainer width="100%" height={horizontalBarHeight(transfersImpact.byProduct.length)}>
                  <BarChart data={transfersImpact.byProduct} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid stroke={GRID} horizontal={false} />
                    <XAxis type="number" tick={axisTickStyle} axisLine={false} tickLine={false} tickFormatter={formatNumber} />
                    <YAxis type="category" dataKey="productSku" tick={axisTickStyle} axisLine={false} tickLine={false} width={78} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--surface-hover)' }} />
                    <Legend wrapperStyle={{ fontSize: 12.5, color: TEXT_DIM }} />
                    <Bar dataKey="projectedOutbound" name="Sale (origen)" fill={SERIES_1} radius={[0, 4, 4, 0]} maxBarSize={16} />
                    <Bar dataKey="projectedInbound" name="Entra (destino)" fill={SERIES_2} radius={[0, 4, 4, 0]} maxBarSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </>
          )}
        </section>

        {/* 4. Productos próximos a agotarse (reabastecimiento) */}
        <section className="panel-card">
          <h2>Productos próximos a agotarse</h2>
          {!lowStock ? (
            <p>Cargando…</p>
          ) : lowStock.length === 0 ? (
            <p>Ningún producto por debajo de su stock mínimo en esta sucursal.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={horizontalBarHeight(lowStock.length)}>
                <BarChart data={lowStock} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid stroke={GRID} horizontal={false} />
                  <XAxis type="number" tick={axisTickStyle} axisLine={false} tickLine={false} tickFormatter={formatNumber} />
                  <YAxis type="category" dataKey="productSku" tick={axisTickStyle} axisLine={false} tickLine={false} width={78} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--surface-hover)' }} />
                  <Legend wrapperStyle={{ fontSize: 12.5, color: TEXT_DIM }} />
                  <Bar dataKey="currentQuantity" name="Actual" fill={SERIES_1} radius={[0, 4, 4, 0]} maxBarSize={16} />
                  <Bar dataKey="minStock" name="Mínimo" fill={SERIES_2} radius={[0, 4, 4, 0]} maxBarSize={16} />
                </BarChart>
              </ResponsiveContainer>
              <table>
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Producto</th>
                    <th>Actual</th>
                    <th>Mínimo</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.map((item) => (
                    <tr key={item.productId}>
                      <td>{item.productSku}</td>
                      <td>{item.productName}</td>
                      <td>{item.currentQuantity}</td>
                      <td>{item.minStock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </section>

        {/* 5. Comparativa entre sucursales — solo ADMIN_GENERAL */}
        {isAdmin && (
          <section className="panel-card dashboard-section-wide">
            <h2>Comparativa entre sucursales</h2>
            {!comparison ? (
              <p>Cargando…</p>
            ) : (
              <div className="dashboard-comparison-charts">
                <div>
                  <h3>Ventas del mes por sucursal</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={comparison}>
                      <CartesianGrid stroke={GRID} vertical={false} />
                      <XAxis dataKey="branchName" tick={axisTickStyle} axisLine={{ stroke: GRID }} tickLine={false} />
                      <YAxis tick={axisTickStyle} axisLine={false} tickLine={false} width={64} tickFormatter={formatNumber} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--surface-hover)' }} />
                      <Bar dataKey="currentMonthSales" name="Ventas del mes" fill={SERIES_1} radius={[4, 4, 0, 0]} maxBarSize={48} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <h3>Alertas de stock y transferencias activas</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={comparison}>
                      <CartesianGrid stroke={GRID} vertical={false} />
                      <XAxis dataKey="branchName" tick={axisTickStyle} axisLine={{ stroke: GRID }} tickLine={false} />
                      <YAxis allowDecimals={false} tick={axisTickStyle} axisLine={false} tickLine={false} width={40} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--surface-hover)' }} />
                      <Legend wrapperStyle={{ fontSize: 12.5, color: TEXT_DIM }} />
                      <Bar dataKey="lowStockProductsCount" name="Productos en alerta" fill={SERIES_1} radius={[4, 4, 0, 0]} maxBarSize={28} />
                      <Bar dataKey="activeTransfersAsOrigin" name="Transf. como origen" fill={SERIES_2} radius={[4, 4, 0, 0]} maxBarSize={28} />
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
            )}
          </section>
        )}
      </div>
    </main>
  );
}
