import { useEffect, useState } from 'react';
import httpClient from '../api/httpClient';
import ComplianceBarChart from '../components/ComplianceBarChart';
import { routePriorityLabel } from '../constants/transfers';

const EMPTY_FILTERS = { from: '', to: '' };

export default function LogisticsComplianceReportPage() {
  const [branches, setBranches] = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);

  const search = async (event) => {
    event?.preventDefault();
    setError(null);
    setSearching(true);
    try {
      const params = {};
      if (filters.from) params.from = `${filters.from}T00:00:00`;
      if (filters.to) params.to = `${filters.to}T23:59:59`;
      const { data } = await httpClient.get('/api/transfers/reports/compliance', { params });
      setRows(data);
    } catch {
      setError('No se pudo consultar el reporte de cumplimiento.');
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    Promise.all([httpClient.get('/api/branches'), httpClient.get('/api/transfers/reports/compliance')])
      .then(([branchesRes, reportRes]) => {
        setBranches(branchesRes.data);
        setRows(reportRes.data);
      })
      .catch(() => setError('No se pudo cargar el reporte.'))
      .finally(() => setLoading(false));
  }, []);

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
  };

  const branchNames = {};
  const branchCodes = {};
  branches.forEach((branch) => {
    branchNames[branch.id] = branch.name;
    branchCodes[branch.id] = branch.code;
  });

  if (loading) return <main>Cargando…</main>;

  const totalConsidered = rows.reduce((sum, row) => sum + row.totalTransfers, 0);

  return (
    <main>
      <h1>Cumplimiento logístico</h1>
      <p>
        % de transferencias que llegaron a la sucursal destino antes o en la fecha estimada, por sucursal origen y
        prioridad de ruta.
      </p>
      {error && <p role="alert">{error}</p>}

      <form onSubmit={search} noValidate>
        <label htmlFor="from">Desde (fecha de llegada)</label>
        <input id="from" type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} />

        <label htmlFor="to">Hasta (fecha de llegada)</label>
        <input id="to" type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} />

        <button type="submit" disabled={searching}>
          {searching ? 'Consultando…' : 'Filtrar'}
        </button>
        <button type="button" onClick={clearFilters}>
          Limpiar filtros
        </button>
      </form>

      {totalConsidered === 0 ? (
        <p>No hay transferencias recibidas con fecha estimada en este rango.</p>
      ) : (
        <>
          <ComplianceBarChart rows={rows} branchCodes={branchCodes} branchNames={branchNames} />

          <table>
            <thead>
              <tr>
                <th>Sucursal origen</th>
                <th>Prioridad de ruta</th>
                <th>Transferencias consideradas</th>
                <th>A tiempo</th>
                <th>% de cumplimiento</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.originBranchId}-${row.routePriority}`}>
                  <td>{branchNames[row.originBranchId] ?? `Sucursal ${row.originBranchId}`}</td>
                  <td>{routePriorityLabel(row.routePriority)}</td>
                  <td>{row.totalTransfers}</td>
                  <td>{row.onTimeTransfers}</td>
                  <td>{row.onTimePercentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </main>
  );
}
