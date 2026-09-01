import { Link } from 'react-router-dom';
import { useController } from '@/lib/useController';
import { DataTable } from '@/components/DataTable';
import { AsyncBoundary } from '@/components/AsyncBoundary';
import { TextField } from '@/components/Field';
import { PATHS } from '@/app/routes';
import { ComplianceReportController } from './controllers/ComplianceReportController';
import { ComplianceBarChart } from './components/ComplianceBarChart';
import { routePriorityLabel } from './constants';
import './Transfers.css';

export default function ComplianceReportPage() {
  const controller = useController(ComplianceReportController);
  const rows = controller.rows.value;
  const branchNames = controller.branchNames.value;
  const filters = controller.filters.value;

  const columns = [
    {
      key: 'origin',
      header: 'Sucursal origen',
      render: (row) => branchNames[row.originBranchId] ?? `Sucursal ${row.originBranchId}`,
    },
    { key: 'routePriority', header: 'Prioridad de ruta', render: (row) => routePriorityLabel(row.routePriority) },
    { key: 'totalTransfers', header: 'Transferencias consideradas' },
    { key: 'onTimeTransfers', header: 'A tiempo' },
    { key: 'onTimePercentage', header: '% de cumplimiento', render: (row) => `${row.onTimePercentage}%` },
  ];

  return (
    <main>
      <h1>Cumplimiento logístico</h1>
      <p>
        % de transferencias que llegaron a la sucursal destino antes o en la fecha estimada, por sucursal
        origen y prioridad de ruta.
      </p>

      <div className="button-row">
        <Link to={PATHS.transfers} className="button-link">
          ← Volver a transferencias
        </Link>
      </div>

      <AsyncBoundary loading={controller.loading.value}>
        {controller.totalConsidered.value === 0 ? (
          <p>No hay transferencias recibidas con fecha estimada en este rango.</p>
        ) : (
          <div className="compliance-panel">
            <ComplianceBarChart
              rows={rows}
              branchCodes={controller.branchCodes.value}
              branchNames={branchNames}
            />
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(row) => `${row.originBranchId}-${row.routePriority}`}
            />
          </div>
        )}

        <form onSubmit={(event) => controller.search(event)} noValidate>
          <TextField
            label="Desde (fecha de llegada)"
            type="date"
            value={filters.from}
            onChange={(value) => controller.setFilter('from', value)}
          />
          <TextField
            label="Hasta (fecha de llegada)"
            type="date"
            value={filters.to}
            onChange={(value) => controller.setFilter('to', value)}
          />
          <button type="submit" disabled={controller.searching.value}>
            {controller.searching.value ? 'Consultando…' : 'Filtrar'}
          </button>
          <button type="button" onClick={controller.clearFilters}>
            Limpiar filtros
          </button>
        </form>
      </AsyncBoundary>
    </main>
  );
}
