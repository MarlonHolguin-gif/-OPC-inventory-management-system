import { useParams } from 'react-router-dom';
import { useController } from '@/lib/useController';
import { DataTable } from '@/components/DataTable';
import { AsyncBoundary } from '@/components/AsyncBoundary';
import { TextField } from '@/components/Field';
import { TransferDetailController } from './TransferDetailController';
import { TransferTimeline } from './components/TransferTimeline';
import { statusBadgeClass, transferStatusLabel, urgencyBadgeClass, urgencyLabel } from './constants';
import './Transfers.css';

const RECEIVED_STATUSES = ['FULLY_RECEIVED', 'PARTIALLY_RECEIVED'];

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString() : null;
}

const ITEM_COLUMNS = [
  { key: 'productSku', header: 'SKU' },
  { key: 'productName', header: 'Producto' },
  { key: 'requestedQuantity', header: 'Solicitada' },
  { key: 'shippedQuantity', header: 'Enviada', render: (i) => i.shippedQuantity ?? '—' },
  { key: 'receivedQuantity', header: 'Recibida', render: (i) => i.receivedQuantity ?? '—' },
  { key: 'difference', header: 'Diferencia', render: (i) => i.difference ?? '—' },
];

export default function TransferDetailPage() {
  const { transferId } = useParams();
  // key: si se navega de un detalle a otro, se remonta con un controller nuevo.
  return <TransferDetailView key={transferId} transferId={transferId} />;
}

function TransferDetailView({ transferId }) {
  const controller = useController(TransferDetailController, transferId);
  const transfer = controller.transfer.value;

  return (
    <main>
      <AsyncBoundary loading={transfer === null}>
        {transfer && <TransferDetailBody controller={controller} transfer={transfer} />}
      </AsyncBoundary>
    </main>
  );
}

function TransferDetailBody({ controller, transfer }) {
  const submitting = controller.submitting.value;

  return (
    <>
      <h1>Transferencia {transfer.transferNumber}</h1>
      <p>
        <span className={statusBadgeClass(transfer.status)}>{transferStatusLabel(transfer.status)}</span>{' '}
        <span className={urgencyBadgeClass(transfer.urgency)}>Urgencia: {urgencyLabel(transfer.urgency)}</span>
      </p>
      <p>
        Origen: <strong>{controller.branchName(transfer.originBranchId)}</strong> → Destino:{' '}
        <strong>{controller.branchName(transfer.destinationBranchId)}</strong>
      </p>
      {transfer.carrier && <p>Transportista: {transfer.carrier}</p>}
      {transfer.estimatedArrivalDate && (
        <p>Llegada estimada: {formatDateTime(transfer.estimatedArrivalDate)}</p>
      )}

      {controller.isCancelled.value ? (
        <p className="badge badge-bad">Esta transferencia fue cancelada.</p>
      ) : (
        <TransferTimeline
          status={transfer.status}
          events={controller.events.value}
          currentStep={controller.currentStep.value}
          isTerminal={controller.isTerminal.value}
        />
      )}

      <DataTable columns={ITEM_COLUMNS} rows={transfer.items} />

      {transfer.status === 'REQUESTED' && controller.canActOnOrigin.value && (
        <form onSubmit={(event) => controller.prepare(event)} noValidate>
          <h2>Preparar envío (sucursal origen)</h2>
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Solicitada</th>
                <th>Cantidad a enviar</th>
              </tr>
            </thead>
            <tbody>
              {transfer.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.productSku} — {item.productName}
                  </td>
                  <td>{item.requestedQuantity}</td>
                  <td>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max={item.requestedQuantity}
                      value={controller.prepareQuantities.value[item.id] ?? '0'}
                      onChange={(event) => controller.setPrepareQuantity(item.id, event.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Guardando…' : 'Confirmar preparación'}
          </button>
        </form>
      )}

      {transfer.status === 'IN_PREPARATION' && controller.canActOnOrigin.value && (
        <form onSubmit={(event) => controller.dispatch(event)} noValidate>
          <h2>Despachar (sucursal origen)</h2>
          <TextField
            label="Transportista"
            value={controller.carrier.value}
            onChange={controller.setCarrier}
          />
          <TextField
            label="Fecha estimada de llegada"
            type="datetime-local"
            value={controller.estimatedArrivalDate.value}
            onChange={controller.setEstimatedArrivalDate}
          />
          <button type="submit" disabled={submitting}>
            {submitting ? 'Despachando…' : 'Confirmar despacho'}
          </button>
        </form>
      )}

      {transfer.status === 'IN_TRANSIT' && controller.canActOnDestination.value && (
        <div className="receive-forms-row">
          <form onSubmit={(event) => controller.receiveComplete(event)} noValidate>
            <h2>Confirmar recepción completa (sucursal destino)</h2>
            <p>Usa esta opción cuando llegó exactamente lo despachado, sin diferencias.</p>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Confirmando…' : 'Recepción completa'}
            </button>
          </form>

          <form onSubmit={(event) => controller.receivePartial(event)} noValidate>
            <h2>Registrar recepción parcial (sucursal destino)</h2>
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Enviada</th>
                  <th>Cantidad recibida</th>
                </tr>
              </thead>
              <tbody>
                {transfer.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {item.productSku} — {item.productName}
                    </td>
                    <td>{item.shippedQuantity ?? 0}</td>
                    <td>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max={item.shippedQuantity ?? 0}
                        value={controller.receiveQuantities.value[item.id] ?? '0'}
                        onChange={(event) => controller.setReceiveQuantity(item.id, event.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Registrando…' : 'Confirmar recepción parcial'}
            </button>
          </form>
        </div>
      )}

      {RECEIVED_STATUSES.includes(transfer.status) && (
        <p>Esta transferencia ya fue recibida — no admite más acciones.</p>
      )}
    </>
  );
}
