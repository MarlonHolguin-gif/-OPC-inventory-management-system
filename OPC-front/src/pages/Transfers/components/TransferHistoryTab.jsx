import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useController } from '@/lib/useController';
import { DataTable } from '@/components/DataTable';
import { AsyncBoundary } from '@/components/AsyncBoundary';
import { Modal } from '@/components/Modal';
import { FilterBar, FilterField } from '@/components/FilterBar';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { TextField, SelectField } from '@/components/Field';
import { BranchDirectoryStore } from '@/stores/BranchDirectoryStore';
import { TransferHistoryController } from '../controllers/TransferHistoryController';
import { ComplianceBarChart } from './ComplianceBarChart';
import {
  TRANSFER_HISTORY_STATUS_OPTIONS,
  routePriorityLabel,
  shortageResolutionLabel,
  statusBadgeClass,
  transferStatusLabel,
} from '../constants';

const HISTORY_COLUMNS = (controller) => [
  {
    key: 'transferNumber',
    header: 'Número',
    render: (row) => <Link to={`/transferencias/${row.id}`}>{row.transferNumber}</Link>,
  },
  { key: 'origin', header: 'Origen', render: (row) => controller.branchName(row.originBranchId) },
  { key: 'destination', header: 'Destino', render: (row) => controller.branchName(row.destinationBranchId) },
  {
    key: 'status',
    header: 'Estado',
    render: (row) => <span className={statusBadgeClass(row.status)}>{transferStatusLabel(row.status)}</span>,
  },
  {
    key: 'decision',
    header: 'Decisión',
    render: (row) => {
      if (row.status !== 'PARTIALLY_RECEIVED') return '—';
      return row.shortageResolution ? shortageResolutionLabel(row.shortageResolution) : 'Pendiente';
    },
  },
];

const COMPLIANCE_COLUMNS = (branchNames) => [
  {
    key: 'origin',
    header: 'Sucursal origen',
    render: (row) => branchNames[row.originBranchId] ?? `Sucursal ${row.originBranchId}`,
  },
  { key: 'routePriority', header: 'Prioridad de ruta', render: (row) => routePriorityLabel(row.routePriority) },
  { key: 'totalTransfers', header: 'Transferencias consideradas', align: 'right' },
  { key: 'onTimeTransfers', header: 'A tiempo', align: 'right' },
  {
    key: 'onTimePercentage',
    header: '% de cumplimiento',
    align: 'right',
    render: (row) => `${row.onTimePercentage}%`,
  },
];

export function TransferHistoryTab() {
  const controller = useController(TransferHistoryController);
  const [complianceOpen, setComplianceOpen] = useState(false);
  const filters = controller.filters.value;
  const branchOptions = BranchDirectoryStore.all.value.map((b) => ({ value: b.id, label: b.name }));
  const complianceRows = controller.complianceRows.value;

  return (
    <div className="transfers-history">
      <FilterBar onSubmit={(event) => controller.search(event)}>
        <FilterField>
          <TextField
            label="Número"
            value={filters.number}
            onChange={(value) => controller.setFilter('number', value)}
            placeholder="Filtra los resultados"
          />
        </FilterField>
        <FilterField>
          <SelectField
            label="Origen"
            value={filters.originBranchId}
            onChange={(value) => controller.setFilter('originBranchId', value)}
            options={branchOptions}
            placeholder="Todas"
          />
        </FilterField>
        <FilterField>
          <SelectField
            label="Destino"
            value={filters.destinationBranchId}
            onChange={(value) => controller.setFilter('destinationBranchId', value)}
            options={branchOptions}
            placeholder="Todas"
          />
        </FilterField>
        <FilterField>
          <SelectField
            label="Estado"
            value={filters.status}
            onChange={(value) => controller.setFilter('status', value)}
            options={TRANSFER_HISTORY_STATUS_OPTIONS}
            placeholder="Todos"
          />
        </FilterField>
        <DateRangeFilter
          fromLabel="Llegada desde"
          toLabel="Llegada hasta"
          from={filters.from}
          to={filters.to}
          onFromChange={(value) => controller.setFilter('from', value)}
          onToChange={(value) => controller.setFilter('to', value)}
        />
        <FilterBar.Actions>
          <button type="submit" disabled={controller.searching.value}>
            {controller.searching.value ? 'Consultando…' : 'Filtrar'}
          </button>
          <button type="button" onClick={controller.clearFilters}>
            Limpiar filtros
          </button>
        </FilterBar.Actions>
        <button
          type="button"
          className="button-link compliance-open-btn"
          onClick={() => setComplianceOpen(true)}
        >
          % de cumplimiento
        </button>
      </FilterBar>

      <div className="transfers-history-body">
        <AsyncBoundary loading={controller.loading.value}>
          <DataTable
            columns={HISTORY_COLUMNS(controller)}
            rows={controller.rows.value}
            empty="No hay transferencias recibidas en el histórico"
          />
        </AsyncBoundary>
      </div>

      {complianceOpen && (
        <Modal title="Cumplimiento logístico" onClose={() => setComplianceOpen(false)} size="wide">
          {controller.totalConsidered.value === 0 ? (
            <p>No hay transferencias recibidas con fecha estimada en este rango.</p>
          ) : (
            <>
              <ComplianceBarChart
                rows={complianceRows}
                branchCodes={controller.branchCodes.value}
                branchNames={controller.branchNames.value}
              />
              <DataTable
                columns={COMPLIANCE_COLUMNS(controller.branchNames.value)}
                rows={complianceRows}
                rowKey={(row) => `${row.originBranchId}-${row.routePriority}`}
              />
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
