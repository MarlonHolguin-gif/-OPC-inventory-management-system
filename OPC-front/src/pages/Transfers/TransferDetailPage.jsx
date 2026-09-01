import { Link, useParams } from 'react-router-dom';
import { useController } from '@/lib/useController';
import { DataTable } from '@/components/DataTable';
import { AsyncBoundary } from '@/components/AsyncBoundary';
import { TextField, SelectField } from '@/components/Field';
import { TransferDetailController } from './controllers/TransferDetailController';
import { TransferTimeline } from './components/TransferTimeline';
import {
  SHORTAGE_RESOLUTION_LABELS,
  shortageResolutionLabel,
  statusBadgeClass,
  transferStatusLabel,
  urgencyBadgeClass,
  urgencyLabel,
} from './constants';
import './Transfers.css';

const SHORTAGE_RESOLUTION_OPTIONS = Object.entries(SHORTAGE_RESOLUTION_LABELS).map(([value, label]) => ({
  value,
  label,
}));

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
  const loadError = controller.loadError.value;

  return (
    <main>
      <p>
        <Link to="/transferencias">← Volver a Transferencias</Link>
      </p>
      {loadError ? (
        <p className="badge badge-bad">{loadError}</p>
      ) : (
        <AsyncBoundary loading={transfer === null}>
          {transfer && <TransferDetailBody controller={controller} transfer={transfer} />}
        </AsyncBoundary>
      )}
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

      {transfer.status === 'PARTIALLY_RECEIVED' && (
        <ShortageSection controller={controller} transfer={transfer} submitting={submitting} />
      )}

      {transfer.status === 'FULLY_RECEIVED' && (
        <p>Esta transferencia ya fue recibida por completo — no admite más acciones.</p>
      )}
    </>
  );
}

function ShortageSection({ controller, transfer, submitting }) {
  if (controller.shortageResolved.value) {
    return (
      <div className="shortage-box">
        <h2>Tratamiento del faltante</h2>
        <p>
          <span className="badge badge-ok">{shortageResolutionLabel(transfer.shortageResolution)}</span>
        </p>
        {transfer.shortageResolutionNotes && <p>{transfer.shortageResolutionNotes}</p>}
        {transfer.reshipmentTransferId && (
          <p>
            Se generó una transferencia de reenvío:{' '}
            <Link to={`/transferencias/${transfer.reshipmentTransferId}`}>ver transferencia de seguimiento</Link>
          </p>
        )}
      </div>
    );
  }

  if (!controller.needsShortageResolution.value) {
    return null;
  }

  if (!controller.canActOnDestination.value) {
    return (
      <div className="shortage-box">
        <h2>Faltante pendiente de tratamiento</h2>
        <p>La sucursal destino debe definir qué hacer con el faltante (reenvío, ajuste o reclamación).</p>
      </div>
    );
  }

  return (
    <form className="shortage-box" onSubmit={(event) => controller.resolveShortage(event)} noValidate>
      <h2>Definir tratamiento del faltante (sucursal destino)</h2>
      <p>
        Hubo diferencias en la recepción. Elige cómo se trata:{' '}
        <strong>Reenvío</strong> genera automáticamente una nueva transferencia por lo que faltó;{' '}
        <strong>Ajuste</strong> asume la merma; <strong>Reclamación</strong> deja registro para reclamar al
        transportista.
      </p>
      <SelectField
        label="Tratamiento"
        value={controller.shortageResolution.value}
        onChange={controller.setShortageResolution}
        options={SHORTAGE_RESOLUTION_OPTIONS}
        placeholder="— elegir —"
      />
      <TextField
        label="Notas (opcional)"
        value={controller.shortageNotes.value}
        onChange={controller.setShortageNotes}
      />
      <button type="submit" disabled={submitting}>
        {submitting ? 'Registrando…' : 'Registrar tratamiento'}
      </button>
    </form>
  );
}
