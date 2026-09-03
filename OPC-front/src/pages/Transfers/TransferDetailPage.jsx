import { Link, useParams } from 'react-router-dom';
import { useController } from '@/lib/useController';
import { DataTable } from '@/components/DataTable';
import { AsyncBoundary } from '@/components/AsyncBoundary';
import { TextField, SelectField } from '@/components/Field';
import { TransferDetailController } from './controllers/TransferDetailController';
import { TransferTimeline } from './components/TransferTimeline';
import {
  ROUTE_PRIORITY_OPTIONS,
  SHORTAGE_RESOLUTION_LABELS,
  deliveryDeviationLabel,
  routePriorityBadgeClass,
  routePriorityLabel,
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
        <span className={urgencyBadgeClass(transfer.urgency)}>Urgencia: {urgencyLabel(transfer.urgency)}</span>{' '}
        <span className={routePriorityBadgeClass(transfer.routePriority)}>
          Prioridad de ruta: {routePriorityLabel(transfer.routePriority)}
        </span>
      </p>
      <p>
        Origen: <strong>{controller.branchName(transfer.originBranchId)}</strong> → Destino:{' '}
        <strong>{controller.branchName(transfer.destinationBranchId)}</strong>
      </p>
      {transfer.carrier && <p>Transportista: {transfer.carrier}</p>}

      {controller.canClassifyRoute.value && (
        <RouteClassificationForm controller={controller} submitting={submitting} />
      )}

      <DeliveryTimesTable milestones={controller.deliveryMilestones.value} />

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

      {transfer.status === 'REQUESTED' && controller.canManageOrigin.value && (
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
          <TextField
            label="Fecha estimada de despacho (opcional)"
            type="datetime-local"
            min={controller.dispatchMin.value}
            value={controller.estimatedDispatchDate.value}
            onChange={controller.setEstimatedDispatchDate}
          />
          <button type="submit" disabled={submitting}>
            {submitting ? 'Guardando…' : 'Confirmar preparación'}
          </button>
        </form>
      )}

      {transfer.status === 'IN_PREPARATION' && controller.canManageOrigin.value && (
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
            min={controller.arrivalMin.value}
            value={controller.estimatedArrivalDate.value}
            onChange={controller.setEstimatedArrivalDate}
          />
          <button type="submit" disabled={submitting}>
            {submitting ? 'Despachando…' : 'Confirmar despacho'}
          </button>
        </form>
      )}

      {transfer.status === 'IN_TRANSIT' && controller.canManageDestination.value && (
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

// 3.5 — la sucursal origen clasifica la ruta por prioridad mientras la
// transferencia siga viva.
function RouteClassificationForm({ controller, submitting }) {
  return (
    <form className="route-classification" onSubmit={(event) => controller.saveRoutePriority(event)} noValidate>
      <SelectField
        label="Clasificar ruta por prioridad"
        value={controller.routePriorityDraft.value}
        onChange={controller.setRoutePriorityDraft}
        options={ROUTE_PRIORITY_OPTIONS}
        placeholder="— elegir —"
      />
      <button type="submit" disabled={submitting}>
        {submitting ? 'Guardando…' : 'Guardar prioridad'}
      </button>
    </form>
  );
}

// 3.5 — tiempos estimados vs. reales de cada hito del envío, con la
// desviación en días.
function DeliveryTimesTable({ milestones }) {
  return (
    <div className="delivery-times">
      <h2>Tiempos de envío (estimado vs. real)</h2>
      <table>
        <thead>
          <tr>
            <th>Hito</th>
            <th>Estimado</th>
            <th>Real</th>
            <th>Desviación</th>
          </tr>
        </thead>
        <tbody>
          {milestones.map((row) => (
            <tr key={row.milestone}>
              <td>{row.milestone}</td>
              <td>{formatDateTime(row.estimated) ?? '—'}</td>
              <td>{formatDateTime(row.actual) ?? '—'}</td>
              <td>{deliveryDeviationLabel(row.estimated, row.actual)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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

  if (!controller.canManageDestination.value) {
    return (
      <div className="shortage-box">
        <h2>Faltante pendiente de tratamiento</h2>
        <p>El gerente de la sucursal destino debe definir qué hacer con el faltante (reenvío, ajuste o reclamación).</p>
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
