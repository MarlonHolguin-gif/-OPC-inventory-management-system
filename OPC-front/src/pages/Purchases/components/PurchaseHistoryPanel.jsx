import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useController } from '@/lib/useController';
import { usePageSize } from '@/lib/usePageSize';
import { DataTable } from '@/components/DataTable';
import { AsyncBoundary } from '@/components/AsyncBoundary';
import { FilterBar, FilterField } from '@/components/FilterBar';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { SelectField } from '@/components/Field';
import { Pager } from '@/components/Pager';
import { formatCurrency, formatDateTime, formatPercentage } from '@/lib/format';
import { PurchaseHistoryController } from '../controllers/PurchaseHistoryController';
import { PURCHASE_ORDER_STATUS_OPTIONS, purchaseOrderStatusLabel } from '../constants';

const columnsFor = (controller) => [
  {
    key: 'orderNumber',
    header: 'Orden',
    render: (row) => <Link to={`/compras/${row.orderId}`}>{row.orderNumber}</Link>,
  },
  { key: 'orderDate', header: 'Fecha', render: (row) => formatDateTime(row.orderDate) },
  { key: 'branch', header: 'Sucursal', render: (row) => controller.branchName(row.branchId) },
  { key: 'status', header: 'Estado', render: (row) => purchaseOrderStatusLabel(row.status) },
  { key: 'responsibleName', header: 'Responsable', render: (row) => row.responsibleName ?? '—' },
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
  const [cardRef, pageSize] = usePageSize();

  useEffect(() => {
    controller.setPageSize(pageSize);
  }, [pageSize, controller]);

  const supplierOptions = controller.suppliers.value.map((supplier) => ({
    value: supplier.id,
    label: supplier.name,
  }));
  const productOptions = controller.products.value.map((product) => ({
    value: product.id,
    label: `${product.sku} — ${product.name}`,
  }));

  return (
    <div className="purchases-panel">
      <AsyncBoundary variant="screen" loading={controller.loading.value}>
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
            <SelectField
              label="Estado"
              value={filters.status}
              onChange={(value) => controller.setFilter('status', value)}
              options={PURCHASE_ORDER_STATUS_OPTIONS}
              placeholder="Todos"
            />
          </FilterField>
          <DateRangeFilter
            from={filters.from}
            to={filters.to}
            onFromChange={(value) => controller.setFilter('from', value)}
            onToChange={(value) => controller.setFilter('to', value)}
          />
          <FilterBar.Actions>
            <button type="submit" disabled={controller.searching.value}>
              {controller.searching.value ? 'Buscando…' : 'Filtrar'}
            </button>
            <button type="button" onClick={controller.clearFilters}>
              Limpiar filtros
            </button>
          </FilterBar.Actions>
        </FilterBar>

        <div className="purchases-table-card is-paged" ref={cardRef}>
          <DataTable
            columns={columnsFor(controller)}
            rows={controller.pageRows.value}
            rowKey={(row, index) => `${row.orderId}-${row.productId}-${index}`}
            empty="No hay compras que coincidan con los filtros"
          />
        </div>

        <Pager
          page={controller.currentPage.value}
          pageSize={controller.pageSize.value}
          total={controller.rows.value.length}
          onPrev={() => controller.setPage(controller.currentPage.value - 1)}
          onNext={() => controller.setPage(controller.currentPage.value + 1)}
        />
      </AsyncBoundary>
    </div>
  );
}
