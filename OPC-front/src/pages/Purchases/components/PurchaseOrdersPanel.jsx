import { Link } from 'react-router-dom';
import { useController } from '@/lib/useController';
import { DataTable } from '@/components/DataTable';
import { AsyncBoundary } from '@/components/AsyncBoundary';
import { Modal } from '@/components/Modal';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { PurchaseOrdersController } from '../PurchaseOrdersController';
import { PURCHASE_ORDER_VIEWS, purchaseOrderStatusLabel } from '../constants';
import { PurchaseOrderForm } from './PurchaseOrderForm';

const columnsFor = (controller) => [
  {
    key: 'orderNumber',
    header: 'Número',
    render: (order) => <Link to={`/compras/${order.id}`}>{order.orderNumber}</Link>,
  },
  { key: 'branch', header: 'Sucursal', render: (order) => controller.branchName(order.branchId) },
  { key: 'supplierName', header: 'Proveedor' },
  { key: 'orderDate', header: 'Fecha', render: (order) => formatDateTime(order.orderDate) },
  { key: 'status', header: 'Estado', render: (order) => purchaseOrderStatusLabel(order.status) },
  { key: 'total', header: 'Total', align: 'right', render: (order) => formatCurrency(order.total) },
];

export function PurchaseOrdersPanel() {
  const controller = useController(PurchaseOrdersController);
  const form = controller.form;
  const activeView = controller.statusView.value;

  return (
    <div className="purchases-panel">
      <div className="purchase-orders-toolbar">
        <button type="button" className="button-link primary" onClick={form.openCreate}>
          + Nueva orden de compra
        </button>
        <div className="status-toggle" role="group" aria-label="Filtrar órdenes por estado">
          {PURCHASE_ORDER_VIEWS.map((view) => (
            <button
              key={view.id}
              type="button"
              className={view.id === activeView ? 'is-active' : ''}
              onClick={() => controller.setStatusView(view.id)}
            >
              {view.label} ({controller.countFor(view.id)})
            </button>
          ))}
        </div>
      </div>

      <AsyncBoundary variant="screen" loading={controller.loading.value}>
        <div className="purchases-table-card">
          <DataTable
            columns={columnsFor(controller)}
            rows={controller.filteredOrders.value}
            empty="No hay órdenes de compra en esta vista"
            actions={(order) =>
              order.status === 'DRAFT' ? (
                <button type="button" onClick={() => form.openEdit(order)}>
                  Editar
                </button>
              ) : null
            }
          />
        </div>
      </AsyncBoundary>

      {form.visible.value && (
        <Modal
          title={form.editingId.value ? 'Editar orden de compra' : 'Nueva orden de compra'}
          onClose={form.close}
          size="wide"
        >
          <PurchaseOrderForm controller={form} />
        </Modal>
      )}
    </div>
  );
}
