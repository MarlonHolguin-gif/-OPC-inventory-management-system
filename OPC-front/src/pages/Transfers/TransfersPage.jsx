import { Link } from 'react-router-dom';
import { useController } from '@/lib/useController';
import { DataTable } from '@/components/DataTable';
import { AsyncBoundary } from '@/components/AsyncBoundary';
import { Modal } from '@/components/Modal';
import { SelectField } from '@/components/Field';
import { PATHS } from '@/app/routes';
import { TransfersController } from './TransfersController';
import { TransferForm } from './components/TransferForm';
import {
  ROUTE_PRIORITY_FILTER_OPTIONS,
  routePriorityBadgeClass,
  routePriorityLabel,
  urgencyBadgeClass,
  urgencyLabel,
} from './constants';
import './Transfers.css';

function sectionColumns(controller) {
  return [
    {
      key: 'transferNumber',
      header: 'Número',
      render: (row) => <Link to={`/transferencias/${row.id}`}>{row.transferNumber}</Link>,
    },
    { key: 'origin', header: 'Origen', render: (row) => controller.branchName(row.originBranchId) },
    { key: 'destination', header: 'Destino', render: (row) => controller.branchName(row.destinationBranchId) },
    {
      key: 'urgency',
      header: 'Urgencia',
      render: (row) => <span className={urgencyBadgeClass(row.urgency)}>{urgencyLabel(row.urgency)}</span>,
    },
    {
      key: 'routePriority',
      header: 'Prioridad de ruta',
      render: (row) => (
        <span className={routePriorityBadgeClass(row.routePriority)}>{routePriorityLabel(row.routePriority)}</span>
      ),
    },
    {
      key: 'requestDate',
      header: 'Fecha de solicitud',
      render: (row) => new Date(row.requestDate).toLocaleDateString(),
    },
  ];
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function TransfersPage() {
  const controller = useController(TransfersController);
  const sections = controller.sections.value;
  const lastUpdated = controller.lastUpdated.value;

  return (
    <main>
      <div className="panel-header">
        <h1>Transferencias entre sucursales</h1>
        <div className="panel-refresh">
          {lastUpdated && <span>Actualizado {formatTime(lastUpdated)}</span>}
          <button type="button" onClick={() => controller.tick()} disabled={controller.refreshing.value}>
            {controller.refreshing.value ? 'Actualizando…' : 'Actualizar ahora'}
          </button>
        </div>
      </div>

      <div className="button-row">
        <button type="button" className="button-link primary" onClick={controller.form.open}>
          + Solicitar transferencia
        </button>
        {controller.isAdmin.value && (
          <Link to={PATHS.logisticsCompliance} className="button-link">
            Ver cumplimiento logístico
          </Link>
        )}
      </div>

      <div className="transfers-filter">
        <SelectField
          label="Filtrar por prioridad de ruta"
          value={controller.routePriorityFilter.value}
          onChange={controller.setRoutePriorityFilter}
          options={ROUTE_PRIORITY_FILTER_OPTIONS}
          placeholder={null}
        />
      </div>

      {controller.form.visible.value && (
        <Modal title="Solicitar transferencia" onClose={controller.form.close} size="wide">
          <TransferForm controller={controller.form} />
        </Modal>
      )}

      <AsyncBoundary loading={controller.transfers.value === null}>
        {sections.length === 0 && <p>No hay transferencias registradas todavía.</p>}

        {sections.map((section) => (
          <div className="status-section" key={section.status}>
            <h2>
              {section.label} <span className="count">{section.items.length}</span>
            </h2>
            <DataTable columns={sectionColumns(controller)} rows={section.items} />
          </div>
        ))}
      </AsyncBoundary>
    </main>
  );
}
