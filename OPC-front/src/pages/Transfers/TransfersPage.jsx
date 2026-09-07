import { Link } from 'react-router-dom';
import { useController } from '@/lib/useController';
import { DataTable } from '@/components/DataTable';
import { AsyncBoundary } from '@/components/AsyncBoundary';
import { Modal } from '@/components/Modal';
import { Tabs } from '@/components/Tabs';
import { TransfersController } from './TransfersController';
import { TransferForm } from './components/TransferForm';
import { TransferHistoryTab } from './components/TransferHistoryTab';
import {
  TRANSFER_ACTIVE_STATUSES,
  TRANSFER_TABS,
  routePriorityBadgeClass,
  routePriorityLabel,
  urgencyBadgeClass,
  urgencyLabel,
} from './constants';
import './Transfers.css';

function activeColumns(controller) {
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
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function TransfersPage() {
  const controller = useController(TransfersController);
  const tab = controller.activeTab.value;
  const status = controller.activeStatus.value;
  const lastUpdated = controller.lastUpdated.value;
  const loaded = controller.transfers.value !== null;

  return (
    <main className="transfers-page">
      <Tabs items={TRANSFER_TABS} active={tab} onSelect={controller.setTab} />

      {controller.form.visible.value && (
        <Modal title="Solicitar transferencia" onClose={controller.form.close} size="wide">
          <TransferForm controller={controller.form} />
        </Modal>
      )}

      {tab === 'history' ? (
        <TransferHistoryTab />
      ) : (
        <>
          <div className="transfers-toolbar">
            <button type="button" className="button-link primary" onClick={controller.form.open}>
              + Solicitar transferencia
            </button>
            <div className="status-toggle" role="group" aria-label="Filtrar transferencias por estado">
              {TRANSFER_ACTIVE_STATUSES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={option.id === status ? 'is-active' : ''}
                  onClick={() => controller.setActiveStatus(option.id)}
                >
                  {option.label} {loaded ? `(${controller.countForStatus(option.id)})` : ''}
                </button>
              ))}
            </div>
            <span className="transfers-refresh">
              {lastUpdated && <span>Actualizado {formatTime(lastUpdated)}</span>}
              <button type="button" onClick={() => controller.tick()} disabled={controller.refreshing.value}>
                {controller.refreshing.value ? 'Actualizando…' : 'Actualizar ahora'}
              </button>
            </span>
          </div>

          <AsyncBoundary loading={!loaded}>
            <div className="transfers-table-card">
              <DataTable
                columns={activeColumns(controller)}
                rows={controller.rowsForStatus(status)}
                empty="No hay transferencias en este estado"
              />
            </div>
          </AsyncBoundary>
        </>
      )}
    </main>
  );
}
