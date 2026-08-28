import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import httpClient from '../api/httpClient';
import { useAuth } from '../hooks/useAuth';
import {
  TRANSFER_TIMELINE_STEPS,
  statusBadgeClass,
  timelineStepIndex,
  transferStatusLabel,
  urgencyBadgeClass,
  urgencyLabel,
} from '../constants/transfers';

const GENERAL_ADMIN_ROLE = 'GENERAL_ADMIN';
const RECEIVED_STATUSES = ['FULLY_RECEIVED', 'PARTIALLY_RECEIVED'];

function formatDateTime(value) {
  if (!value) return null;
  return new Date(value).toLocaleString();
}

export default function TransferDetailPage() {
  const { transferId } = useParams();
  const { branches: ownBranches, role } = useAuth();
  const isAdmin = role === GENERAL_ADMIN_ROLE;

  const [transfer, setTransfer] = useState(null);
  const [events, setEvents] = useState([]);
  const [branchNames, setBranchNames] = useState({});

  const [prepareQuantities, setPrepareQuantities] = useState({});
  const [carrier, setCarrier] = useState('');
  const [estimatedArrivalDate, setEstimatedArrivalDate] = useState('');
  const [receiveQuantities, setReceiveQuantities] = useState({});

  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Devuelve la promesa (no es fire-and-forget): runAction() la espera antes
  // de mostrar el mensaje de éxito, para que la línea de tiempo y el badge
  // de estado ya se vean actualizados en el mismo momento en que se avisa
  // que la acción funcionó — si no, hay una ventana donde el mensaje dice
  // "éxito" pero la pantalla todavía muestra el estado anterior.
  const loadTransfer = () => {
    return Promise.all([
      httpClient.get(`/api/transfers/${transferId}`),
      httpClient.get(`/api/transfers/${transferId}/events`),
    ]).then(([transferRes, eventsRes]) => {
      setTransfer(transferRes.data);
      setEvents(eventsRes.data);
      // Precarga: preparar sugiere enviar lo solicitado, recibir sugiere
      // recibir lo despachado — el usuario ajusta si hay diferencias.
      const initialPrepare = {};
      const initialReceive = {};
      transferRes.data.items.forEach((item) => {
        initialPrepare[item.id] = String(item.requestedQuantity);
        initialReceive[item.id] = String(item.shippedQuantity ?? 0);
      });
      setPrepareQuantities(initialPrepare);
      setReceiveQuantities(initialReceive);
    });
  };

  useEffect(() => {
    // loadTransfer() ahora devuelve una promesa (para poder esperarla desde
    // runAction) — si se pasara directo como callback del efecto, React
    // tomaría esa promesa como si fuera la función de limpieza y, al
    // desmontar la página (navegar a otra pantalla), intentaría invocarla
    // como función y explotaría. Por eso se envuelve así, para que el
    // efecto no devuelva nada.
    loadTransfer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transferId]);

  useEffect(() => {
    httpClient.get('/api/branches').then(({ data }) => {
      const names = {};
      data.forEach((branch) => {
        names[branch.id] = branch.name;
      });
      setBranchNames(names);
    });
  }, []);

  if (!transfer) return <main>Cargando…</main>;

  const canWrite = (branchId) => isAdmin || (Array.isArray(ownBranches) && ownBranches.includes(branchId));
  const canActOnOrigin = canWrite(transfer.originBranchId);
  const canActOnDestination = canWrite(transfer.destinationBranchId);
  const currentStep = timelineStepIndex(transfer.status);
  const isCancelled = transfer.status === 'CANCELLED';
  // Si ya llegó a un estado terminal (recibida completa o parcial), el
  // último paso se pinta como completado, no como "en curso" — ya no queda
  // nada pendiente en esta transferencia.
  const isTerminal = RECEIVED_STATUSES.includes(transfer.status);

  const runAction = async (action) => {
    setError(null);
    setSuccessMessage(null);
    setSubmitting(true);
    try {
      const message = await action();
      await loadTransfer();
      setSuccessMessage(message);
    } catch (submitError) {
      setError(submitError.response?.data?.message ?? 'No se pudo completar la acción.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrepare = (event) => {
    event.preventDefault();
    // 0 es un valor válido (ej. se agotó el stock de ese producto en
    // origen y no se puede enviar nada) — se manda siempre el ítem
    // completo, no solo los que quedaron en positivo.
    const items = transfer.items.map((item) => ({
      transferItemId: item.id,
      shippedQuantity: Number(prepareQuantities[item.id] ?? 0),
    }));
    runAction(async () => {
      await httpClient.post(`/api/transfers/${transferId}/prepare`, { items });
      return 'Envío preparado correctamente.';
    });
  };

  const handleDispatch = (event) => {
    event.preventDefault();
    if (!carrier.trim()) {
      setError('Indica el transportista.');
      return;
    }
    runAction(async () => {
      await httpClient.post(`/api/transfers/${transferId}/dispatch`, {
        carrier: carrier.trim(),
        estimatedArrivalDate: estimatedArrivalDate || null,
      });
      return 'Transferencia despachada correctamente.';
    });
  };

  const handleReceiveComplete = (event) => {
    event.preventDefault();
    runAction(async () => {
      await httpClient.post(`/api/transfers/${transferId}/receive-complete`);
      return 'Recepción completa registrada.';
    });
  };

  const handleReceivePartial = (event) => {
    event.preventDefault();
    // 0 es un valor válido (ej. se despachó pero no llegó nada de ese
    // producto) — se manda siempre el ítem completo, no solo los que
    // quedaron en positivo.
    const items = transfer.items.map((item) => ({
      transferItemId: item.id,
      receivedQuantity: Number(receiveQuantities[item.id] ?? 0),
    }));
    runAction(async () => {
      await httpClient.post(`/api/transfers/${transferId}/receive-partial`, { items });
      return 'Recepción parcial registrada.';
    });
  };

  return (
    <main>
      <h1>Transferencia {transfer.transferNumber}</h1>
      <p>
        <span className={statusBadgeClass(transfer.status)}>{transferStatusLabel(transfer.status)}</span>{' '}
        <span className={urgencyBadgeClass(transfer.urgency)}>Urgencia: {urgencyLabel(transfer.urgency)}</span>
      </p>
      <p>
        Origen: <strong>{branchNames[transfer.originBranchId] ?? transfer.originBranchId}</strong> → Destino:{' '}
        <strong>{branchNames[transfer.destinationBranchId] ?? transfer.destinationBranchId}</strong>
      </p>
      {transfer.carrier && <p>Transportista: {transfer.carrier}</p>}
      {transfer.estimatedArrivalDate && <p>Llegada estimada: {formatDateTime(transfer.estimatedArrivalDate)}</p>}

      {/* Criterio de aceptación: estado actual + historial completo, visibles en una sola vista */}
      {isCancelled ? (
        <p className="badge badge-bad">Esta transferencia fue cancelada.</p>
      ) : (
        <ol className="transfer-timeline">
          {TRANSFER_TIMELINE_STEPS.map((step, index) => {
            const state =
              index < currentStep || (index === currentStep && isTerminal)
                ? 'done'
                : index === currentStep
                  ? 'current'
                  : 'pending';
            const stepEvent = events.find((event) => step.matches.includes(event.status));
            return (
              <li key={step.key} className={`timeline-step timeline-${state}`}>
                <span className="timeline-dot" />
                <div className="timeline-body">
                  <strong>{step.label(transfer.status)}</strong>
                  {stepEvent && <time>{formatDateTime(stepEvent.eventDate)}</time>}
                  {stepEvent?.notes && <p className="timeline-notes">{stepEvent.notes}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <table>
        <thead>
          <tr>
            <th>SKU</th>
            <th>Producto</th>
            <th>Solicitada</th>
            <th>Enviada</th>
            <th>Recibida</th>
            <th>Diferencia</th>
          </tr>
        </thead>
        <tbody>
          {transfer.items.map((item) => (
            <tr key={item.id}>
              <td>{item.productSku}</td>
              <td>{item.productName}</td>
              <td>{item.requestedQuantity}</td>
              <td>{item.shippedQuantity ?? '—'}</td>
              <td>{item.receivedQuantity ?? '—'}</td>
              <td>{item.difference ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {error && <p role="alert">{error}</p>}
      {successMessage && <p>{successMessage}</p>}

      {transfer.status === 'REQUESTED' && canActOnOrigin && (
        <form onSubmit={handlePrepare} noValidate>
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
                      value={prepareQuantities[item.id] ?? '0'}
                      onChange={(event) =>
                        setPrepareQuantities({ ...prepareQuantities, [item.id]: event.target.value })
                      }
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

      {transfer.status === 'IN_PREPARATION' && canActOnOrigin && (
        <form onSubmit={handleDispatch} noValidate>
          <h2>Despachar (sucursal origen)</h2>
          <label htmlFor="carrier">Transportista</label>
          <input id="carrier" value={carrier} onChange={(event) => setCarrier(event.target.value)} />

          <label htmlFor="estimatedArrivalDate">Fecha estimada de llegada</label>
          <input
            id="estimatedArrivalDate"
            type="datetime-local"
            value={estimatedArrivalDate}
            onChange={(event) => setEstimatedArrivalDate(event.target.value)}
          />

          <button type="submit" disabled={submitting}>
            {submitting ? 'Despachando…' : 'Confirmar despacho'}
          </button>
        </form>
      )}

      {transfer.status === 'IN_TRANSIT' && canActOnDestination && (
        <>
          <form onSubmit={handleReceiveComplete} noValidate>
            <h2>Confirmar recepción completa (sucursal destino)</h2>
            <p>Usa esta opción cuando llegó exactamente lo despachado, sin diferencias.</p>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Confirmando…' : 'Recepción completa'}
            </button>
          </form>

          <form onSubmit={handleReceivePartial} noValidate>
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
                        value={receiveQuantities[item.id] ?? '0'}
                        onChange={(event) =>
                          setReceiveQuantities({ ...receiveQuantities, [item.id]: event.target.value })
                        }
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
        </>
      )}

      {RECEIVED_STATUSES.includes(transfer.status) && <p>Esta transferencia ya fue recibida — no admite más acciones.</p>}
    </main>
  );
}
