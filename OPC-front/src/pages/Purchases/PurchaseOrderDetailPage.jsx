import { useParams } from 'react-router-dom';
import { useController } from '@/lib/useController';
import { DataTable } from '@/components/DataTable';
import { AsyncBoundary } from '@/components/AsyncBoundary';
import { TextField } from '@/components/Field';
import { PurchaseOrderDetailController, pendingQuantity } from './PurchaseOrderDetailController';

const ITEM_COLUMNS = [
  { key: 'productSku', header: 'SKU' },
  { key: 'productName', header: 'Producto' },
  { key: 'quantity', header: 'Pedido' },
  { key: 'receivedQuantity', header: 'Recibido' },
  { key: 'pending', header: 'Pendiente', render: (item) => pendingQuantity(item) },
];

export default function PurchaseOrderDetailPage() {
  const { orderId } = useParams();
  // key: navegar de una orden a otra remonta con un controller nuevo.
  return <PurchaseOrderDetailView key={orderId} orderId={orderId} />;
}

function PurchaseOrderDetailView({ orderId }) {
  const controller = useController(PurchaseOrderDetailController, orderId);
  const order = controller.order.value;

  return (
    <main>
      <AsyncBoundary loading={order === null}>
        {order && <PurchaseOrderDetailBody controller={controller} order={order} />}
      </AsyncBoundary>
    </main>
  );
}

function PurchaseOrderDetailBody({ controller, order }) {
  const submitting = controller.submitting.value;

  return (
    <>
      <h1>Orden {order.orderNumber}</h1>
      <p>
        Proveedor: {order.supplierName} — Estado: <strong>{order.status}</strong>
      </p>

      <DataTable columns={ITEM_COLUMNS} rows={order.items} />

      <p>Total de la orden: {order.total}</p>

      {controller.isClosed.value ? (
        <p>Esta orden ya no admite más recepciones (estado: {order.status}).</p>
      ) : (
        <form onSubmit={(event) => controller.submit(event)} noValidate>
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
              {controller.pendingItems.value.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.productSku} — {item.productName}
                  </td>
                  <td>{pendingQuantity(item)}</td>
                  <td>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max={pendingQuantity(item)}
                      value={controller.receiveQuantities.value[item.id] ?? '0'}
                      onChange={(event) => controller.setReceiveQuantity(item.id, event.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <TextField label="Notas" value={controller.notes.value} onChange={controller.setNotes} />

          <button type="submit" disabled={submitting}>
            {submitting ? 'Registrando…' : 'Confirmar recepción'}
          </button>
        </form>
      )}
    </>
  );
}
