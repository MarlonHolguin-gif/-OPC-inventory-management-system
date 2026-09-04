import { Link } from 'react-router-dom';
import { useController } from '@/lib/useController';
import { DataTable } from '@/components/DataTable';
import { CrudToolbar } from '@/components/CrudToolbar';
import { AsyncBoundary } from '@/components/AsyncBoundary';
import { Modal } from '@/components/Modal';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { PurchaseOrdersController } from '../PurchaseOrdersController';
import { PURCHASE_ORDER_GROUPS, purchaseOrderStatusLabel } from '../constants';
import { PurchaseOrderForm } from './PurchaseOrderForm';

const COLUMNS = [
  {
    key: 'orderNumber',
    header: 'Número',
    render: (order) => <Link to={`/compras/${order.id}`}>{order.orderNumber}</Link>,
  },
  { key: 'supplierName', header: 'Proveedor' },
  { key: 'orderDate', header: 'Fecha', render: (order) => formatDateTime(order.orderDate) },
  { key: 'status', header: 'Estado', render: (order) => purchaseOrderStatusLabel(order.status) },
  { key: 'total', header: 'Total', align: 'right', render: (order) => formatCurrency(order.total) },
];

export function PurchaseOrdersPanel() {
  const controller = useController(PurchaseOrdersController);
  const form = controller.form;
  const orders = controller.orders.value;

  return (
    <>
      <CrudToolbar label="Nueva orden de compra" onCreate={form.openCreate} />

      <AsyncBoundary variant="screen" loading={controller.loading.value}>
        {PURCHASE_ORDER_GROUPS.map((group) => {
          const rows = orders.filter((order) => group.statuses.includes(order.status));
          return (
            <section key={group.id} className="purchase-order-group">
              <h2>
                {group.title} <span className="purchase-order-group-count">({rows.length})</span>
              </h2>
              <div className="table-scroll">
                <DataTable
                  columns={COLUMNS}
                  rows={rows}
                  empty={group.empty}
                  actions={
                    group.id === 'pendingSend'
                      ? (order) => (
                          <button type="button" onClick={() => form.openEdit(order)}>
                            Editar
                          </button>
                        )
                      : undefined
                  }
                />
              </div>
            </section>
          );
        })}
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
    </>
  );
}
