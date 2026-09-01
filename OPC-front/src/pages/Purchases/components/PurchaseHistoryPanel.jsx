import { Link } from 'react-router-dom';
import { useController } from '@/lib/useController';
import { DataTable } from '@/components/DataTable';
import { AsyncBoundary } from '@/components/AsyncBoundary';
import { FilterBar, FilterField } from '@/components/FilterBar';
import { TextField, SelectField } from '@/components/Field';
import { formatCurrency, formatDateTime, formatPercentage } from '@/lib/format';
import { PurchaseHistoryController } from '../controllers/PurchaseHistoryController';
import { purchaseOrderStatusLabel } from '../constants';

const COLUMNS = [
  {
    key: 'orderNumber',
    header: 'Orden',
    render: (row) => <Link to={`/compras/${row.orderId}`}>{row.orderNumber}</Link>,
  },
  { key: 'orderDate', header: 'Fecha', render: (row) => formatDateTime(row.orderDate) },
  { key: 'status', header: 'Estado', render: (row) => purchaseOrderStatusLabel(row.status) },
  { key: 'supplierName', header: 'Proveedor' },
  { key: 'productName', header: 'Producto', render: (row) => `${row.productSku} — ${row.productName}` },
  { key: 'quantity', header: 'Cantidad', align: 'right' },
  { key: 'unitPrice', header: 'Precio unitario', align: 'right', render: (row) => formatCurrency(row.unitPrice) },
  {
    key: 'discountPercentage',
    header: 'Descuento',
    align: 'right',
    render: (row) => formatPercentage(row.discountPercentage),
  },
  { key: 'subtotal', header: 'Subtotal', align: 'right', render: (row) => formatCurrency(row.subtotal) },
  { key: 'paymentTerms', header: 'Plazo de pago', render: (row) => row.paymentTerms || '—' },
];

export function PurchaseHistoryPanel() {
  const controller = useController(PurchaseHistoryController);
  const filters = controller.filters.value;

  const supplierOptions = controller.suppliers.value.map((supplier) => ({
    value: supplier.id,
    label: supplier.name,
  }));
  const productOptions = controller.products.value.map((product) => ({
    value: product.id,
    label: `${product.sku} — ${product.name}`,
  }));

  return (
    <AsyncBoundary loading={controller.loading.value}>
      <FilterBar onSubmit={(event) => controller.search(event)}>
        <FilterField>
          <SelectField
            label="Proveedor"
            value={filters.supplierId}
            onChange={(value) => controller.setFilter('supplierId', value)}
            options={supplierOptions}
            placeholder="Todos"
          />
        </FilterField>
        <FilterField>
          <SelectField
            label="Producto"
            value={filters.productId}
            onChange={(value) => controller.setFilter('productId', value)}
            options={productOptions}
            placeholder="Todos"
          />
        </FilterField>
        <FilterField>
          <TextField
            label="Desde"
            type="date"
            value={filters.from}
            onChange={(value) => controller.setFilter('from', value)}
          />
        </FilterField>
        <FilterField>
          <TextField
            label="Hasta"
            type="date"
            value={filters.to}
            onChange={(value) => controller.setFilter('to', value)}
          />
        </FilterField>
        <FilterBar.Actions>
          <button type="submit" disabled={controller.searching.value}>
            {controller.searching.value ? 'Buscando…' : 'Filtrar'}
          </button>
          <button type="button" onClick={controller.clearFilters}>
            Limpiar filtros
          </button>
        </FilterBar.Actions>
      </FilterBar>

      <div className="table-scroll">
        <DataTable
          columns={COLUMNS}
          rows={controller.rows.value}
          rowKey={(row, index) => `${row.orderId}-${row.productId}-${index}`}
          empty="No hay compras que coincidan con los filtros."
        />
      </div>
    </AsyncBoundary>
  );
}
