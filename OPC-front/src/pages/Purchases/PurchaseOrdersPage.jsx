import { Link } from 'react-router-dom';
import { useController } from '@/lib/useController';
import { DataTable } from '@/components/DataTable';
import { CrudToolbar } from '@/components/CrudToolbar';
import { AsyncBoundary } from '@/components/AsyncBoundary';
import { Modal } from '@/components/Modal';
import { PurchaseOrdersController } from './PurchaseOrdersController';
import { PurchaseOrderForm } from './components/PurchaseOrderForm';

const COLUMNS = [
  {
    key: 'orderNumber',
    header: 'Número',
    render: (order) => <Link to={`/compras/${order.id}`}>{order.orderNumber}</Link>,
  },
  { key: 'supplierName', header: 'Proveedor' },
  { key: 'orderDate', header: 'Fecha', render: (order) => new Date(order.orderDate).toLocaleDateString() },
  { key: 'status', header: 'Estado' },
  { key: 'total', header: 'Total' },
];

export default function PurchaseOrdersPage() {
  const controller = useController(PurchaseOrdersController);
  const form = controller.form;

  return (
    <main>
      <h1>Órdenes de compra</h1>

      <CrudToolbar label="Nueva orden de compra" onCreate={form.open} />

      <AsyncBoundary loading={controller.loading.value}>
        <DataTable columns={COLUMNS} rows={controller.orders.value} empty="No hay órdenes de compra." />
      </AsyncBoundary>

      {form.visible.value && (
        <Modal title="Nueva orden de compra" onClose={form.close} size="wide">
          <PurchaseOrderForm controller={form} />
        </Modal>
      )}
    </main>
  );
}
