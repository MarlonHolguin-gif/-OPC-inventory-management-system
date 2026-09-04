import { useParams } from 'react-router-dom';
import { useController } from '@/lib/useController';
import { DataTable } from '@/components/DataTable';
import { AsyncBoundary } from '@/components/AsyncBoundary';
import { TextField } from '@/components/Field';
import { formatCurrency, formatPercentage } from '@/lib/format';
import { PurchaseOrderDetailController, pendingQuantity } from './controllers/PurchaseOrderDetailController';
import { purchaseOrderStatusLabel } from './constants';

const ITEM_COLUMNS = [
  { key: 'productSku', header: 'SKU' },
  { key: 'productName', header: 'Producto' },
  { key: 'unitAbbreviation', header: 'Unidad' },
  { key: 'quantity', header: 'Pedido', align: 'right' },
  {
    key: 'unitPrice',
    header: 'Precio por unidad',
    align: 'right',
    render: (item) => formatCurrency(item.unitPrice),
  },
  {
    key: 'discountPercentage',
    header: 'Descuento',
    align: 'right',
    render: (item) => formatPercentage(item.discountPercentage),
  },
  { key: 'receivedQuantity', header: 'Recibido', align: 'right' },
  { key: 'pending', header: 'Pendiente', align: 'right', render: (item) => pendingQuantity(item) },
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
      <AsyncBoundary variant="screen" loading={order === null}>
        {order && <PurchaseOrderDetailBody controller={controller} order={order} />}
      </AsyncBoundary>
    </main>
  );
}

function PurchaseOrderDetailBody({ controller, order }) {
  const submitting = controller.submitting.value;
  const transitioning = controller.transitioning.value;

  return (
    <>
      <h1>Orden {order.orderNumber}</h1>
      <p>
        Proveedor: {order.supplierName} — Estado: <strong>{purchaseOrderStatusLabel(order.status)}</strong>
      </p>
      {order.paymentTerms && <p>Plazo de pago: {order.paymentTerms}</p>}

      <div className="button-row">
        {controller.canSend.value && (
          <button type="button" onClick={controller.markAsSent} disabled={transitioning}>
            {transitioning ? 'Procesando…' : 'Enviar al proveedor'}
          </button>
        )}
        {controller.canCancel.value && !controller.confirmingCancel.value && (
          <button type="button" onClick={controller.askCancel} disabled={transitioning}>
            Cancelar orden
          </button>
        )}
      </div>

      {controller.confirmingCancel.value && (
        <div className="button-row">
          <span>¿Seguro que quieres cancelar esta orden de compra?</span>
          <button type="button" onClick={controller.confirmCancel} disabled={transitioning}>
            {transitioning ? 'Cancelando…' : 'Sí, cancelar la orden'}
          </button>
          <button type="button" onClick={controller.dismissCancel} disabled={transitioning}>
            No, volver
          </button>
        </div>
      )}

      <div className="table-scroll">
        <DataTable columns={ITEM_COLUMNS} rows={order.items} />
      </div>

      <p>Total de la orden: {formatCurrency(order.total)}</p>

      {controller.canReceive.value ? (
        <form onSubmit={(event) => controller.submit(event)} noValidate>
          <h2>Registrar recepción de mercancía</h2>
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
                    {item.productSku} — {item.productName} <small>({item.unitAbbreviation})</small>
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
      ) : (
        <p>{receiptHint(order.status)}</p>
      )}
    </>
  );
}

function receiptHint(status) {
  if (status === 'DRAFT') {
    return 'Esta orden todavía está en borrador. Envíala al proveedor para poder registrar recepciones.';
  }
  if (status === 'FULLY_RECEIVED') {
    return 'Esta orden ya se recibió por completo.';
  }
  if (status === 'CANCELLED') {
    return 'Esta orden está cancelada y no admite recepciones.';
  }
  return 'Esta orden no admite recepciones en su estado actual.';
}
