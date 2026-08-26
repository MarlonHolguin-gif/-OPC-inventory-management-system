import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import httpClient from '../api/httpClient';

const CLOSED_STATUSES = ['FULLY_RECEIVED', 'CANCELLED'];

function pending(item) {
  return Number(item.quantity) - Number(item.receivedQuantity);
}

export default function PurchaseOrderDetailPage() {
  const { orderId } = useParams();

  const [order, setOrder] = useState(null);
  const [receiveQuantities, setReceiveQuantities] = useState({});
  const [notes, setNotes] = useState('');
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadOrder = () => {
    httpClient.get(`/api/purchase-orders/${orderId}`).then(({ data }) => {
      setOrder(data);
      // Precarga cada input con la cantidad pendiente por ítem (criterio
      // de aceptación) — el usuario puede bajarla para una recepción parcial.
      const initial = {};
      data.items.forEach((item) => {
        initial[item.id] = pending(item) > 0 ? String(pending(item)) : '0';
      });
      setReceiveQuantities(initial);
    });
  };

  useEffect(loadOrder, [orderId]);

  if (!order) return <main>Cargando…</main>;

  const isClosed = CLOSED_STATUSES.includes(order.status);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const items = order.items
      .map((item) => ({ purchaseOrderItemId: item.id, receivedQuantity: Number(receiveQuantities[item.id]) }))
      .filter((item) => item.receivedQuantity > 0);

    if (items.length === 0) {
      setError('Indica al menos una cantidad a recibir mayor que cero.');
      return;
    }

    setSubmitting(true);
    try {
      await httpClient.post(`/api/purchase-orders/${orderId}/receipts`, { notes: notes || null, items });
      setSuccessMessage('Recepción registrada correctamente.');
      setNotes('');
      loadOrder();
    } catch (submitError) {
      setError(submitError.response?.data?.message ?? 'No se pudo registrar la recepción.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main>
      <h1>Orden {order.orderNumber}</h1>
      <p>
        Proveedor: {order.supplierName} — Estado: <strong>{order.status}</strong>
      </p>

      <table>
        <thead>
          <tr>
            <th>SKU</th>
            <th>Producto</th>
            <th>Pedido</th>
            <th>Recibido</th>
            <th>Pendiente</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id}>
              <td>{item.productSku}</td>
              <td>{item.productName}</td>
              <td>{item.quantity}</td>
              <td>{item.receivedQuantity}</td>
              <td>{pending(item)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p>Total de la orden: {order.total}</p>

      {error && <p role="alert">{error}</p>}
      {successMessage && <p>{successMessage}</p>}

      {isClosed ? (
        <p>Esta orden ya no admite más recepciones (estado: {order.status}).</p>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <h2>Registrar recepción</h2>
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Pendiente</th>
                <th>Cantidad a recibir ahora</th>
              </tr>
            </thead>
            <tbody>
              {order.items
                .filter((item) => pending(item) > 0)
                .map((item) => (
                  <tr key={item.id}>
                    <td>{item.productSku} — {item.productName}</td>
                    <td>{pending(item)}</td>
                    <td>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max={pending(item)}
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

          <label htmlFor="notes">Notas</label>
          <input id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} />

          <button type="submit" disabled={submitting}>
            {submitting ? 'Registrando…' : 'Confirmar recepción'}
          </button>
        </form>
      )}
    </main>
  );
}
