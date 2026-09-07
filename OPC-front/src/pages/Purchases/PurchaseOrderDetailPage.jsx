import { Link, useParams } from 'react-router-dom';
import { useController } from '@/lib/useController';
import { DataTable } from '@/components/DataTable';
import { AsyncBoundary } from '@/components/AsyncBoundary';
import { TextField } from '@/components/Field';
import { formatCurrency, formatPercentage } from '@/lib/format';
import { PurchaseOrderDetailController, pendingQuantity } from './controllers/PurchaseOrderDetailController';
import { purchaseOrderStatusLabel } from './constants';
import './Purchases.css';

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
];

export default function PurchaseOrderDetailPage() {
  const { orderId } = useParams();
  // key: navegar de una orden a otra remonta con un controller nuevo.
  return <PurchaseOrderDetailView key={orderId} orderId={orderId} />;
}

function PurchaseOrderDetailView({ orderId }) {
  const controller = useController(PurchaseOrderDetailController, orderId);
  const order = controller.order.value;

  if (controller.notFound.value) {
    return (
      <main className="purchase-order-detail">
        <Link to="/compras" className="button-link purchase-order-back">
          ← Volver a compras
        </Link>
        <h1>Orden de compra no encontrada</h1>
        <p>No existe una orden de compra con el identificador {orderId}.</p>
      </main>
    );
  }

  return (
    <main className="purchase-order-detail">
      <AsyncBoundary variant="screen" loading={controller.loading.value}>
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
      <Link to="/compras" className="button-link purchase-order-back">
        ← Volver a compras
      </Link>
      <h1>Orden {order.orderNumber}</h1>
      <p>
        Proveedor: {order.supplierName} — Estado: <strong>{purchaseOrderStatusLabel(order.status)}</strong>
      </p>
      {controller.branchName.value && <p>Sucursal: {controller.branchName.value}</p>}
      {order.paymentTerms && <p>Plazo de pago: {order.paymentTerms}</p>}

      <div className="button-row">
        {controller.canSend.value && (
          <button type="button" onClick={controller.markAsSent} disabled={transitioning}>
            {transitioning ? 'Procesando…' : 'Enviar al proveedor'}
          </button>
        )}
        {controller.canCancel.value && !controller.confirmingCancel.value && (
          <button
            type="button"
            className="button-danger"
            onClick={controller.askCancel}
            disabled={transitioning}
          >
            Cancelar orden
          </button>
        )}
      </div>

      {controller.confirmingCancel.value && (
        <div className="button-row">
          <span>¿Seguro que quieres cancelar esta orden de compra?</span>
          <button
            type="button"
            className="button-danger"
            onClick={controller.confirmCancel}
            disabled={transitioning}
          >
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
          <h2>Recepción de mercancía</h2>
          <p>
            La recepción es total: se recibe toda la mercancía pendiente y la orden pasa a{' '}
            <strong>recibida completa</strong>. Si no llegó completa, cancela la orden.
          </p>
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cantidad a recibir</th>
              </tr>
            </thead>
            <tbody>
              {controller.pendingItems.value.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.productSku} — {item.productName} <small>({item.unitAbbreviation})</small>
                  </td>
                  <td>{pendingQuantity(item)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <TextField label="Notas" value={controller.notes.value} onChange={controller.setNotes} />

          <button type="submit" disabled={submitting}>
            {submitting ? 'Registrando…' : 'Confirmar recepción completa'}
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
