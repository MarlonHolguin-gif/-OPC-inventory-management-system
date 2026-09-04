import { Link, useParams } from 'react-router-dom';
import { useController } from '@/lib/useController';
import { DataTable } from '@/components/DataTable';
import { AsyncBoundary } from '@/components/AsyncBoundary';
import { formatCurrency, formatDateTime, formatPercentage } from '@/lib/format';
import { SaleDetailController } from './controllers/SaleDetailController';
import { saleStatusLabel } from './constants';
import './Sales.css';

const ITEM_COLUMNS = [
  { key: 'productSku', header: 'SKU' },
  { key: 'productName', header: 'Producto' },
  { key: 'quantity', header: 'Cantidad', align: 'right' },
  { key: 'unitPrice', header: 'Precio unitario', align: 'right', render: (item) => formatCurrency(item.unitPrice) },
  {
    key: 'discountPct',
    header: 'Descuento',
    align: 'right',
    render: (item) => formatPercentage(item.discountPct),
  },
  { key: 'subtotal', header: 'Subtotal', align: 'right', render: (item) => formatCurrency(item.subtotal) },
];

export default function SaleDetailPage() {
  const { saleId } = useParams();
  // key: navegar de una venta a otra remonta con un controller nuevo.
  return <SaleDetailView key={saleId} saleId={saleId} />;
}

function SaleDetailView({ saleId }) {
  const controller = useController(SaleDetailController, saleId);
  const sale = controller.sale.value;

  return (
    <main>
      <p>
        <Link to="/ventas">← Volver a Ventas</Link>
      </p>

      <AsyncBoundary variant="screen" loading={sale === null}>
        {sale && <SaleReceipt controller={controller} sale={sale} />}
      </AsyncBoundary>
    </main>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <span className="sale-receipt-field-label">{label}</span>
      <span className="sale-receipt-field-value">{value}</span>
    </div>
  );
}

function SaleReceipt({ controller, sale }) {
  return (
    <>
      <h1>Comprobante de venta {sale.saleNumber}</h1>

      <div className="sale-receipt-header">
        <Field label="Fecha" value={formatDateTime(sale.saleDate)} />
        <Field label="Estado" value={saleStatusLabel(sale.status)} />
        <Field label="Sucursal" value={controller.branchName(sale.branchId)} />
        <Field label="Responsable" value={sale.sellerName ?? '—'} />
        <Field label="Cliente" value={sale.customerName ?? 'Venta de mostrador (sin cliente)'} />
        <Field label="Lista de precios" value={sale.priceListName ?? '—'} />
      </div>

      <div className="table-scroll">
        <DataTable columns={ITEM_COLUMNS} rows={sale.items} empty="La venta no tiene ítems." />
      </div>

      <div className="op-totals">
        <span>Subtotal: {formatCurrency(sale.subtotal)}</span>
        <span>Descuento total: {formatCurrency(sale.totalDiscount)}</span>
        <span>
          <strong>Total: {formatCurrency(sale.total)}</strong>
        </span>
      </div>
    </>
  );
}
