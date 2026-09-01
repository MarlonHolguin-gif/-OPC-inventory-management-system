import { Link } from 'react-router-dom';
import { useController } from '@/lib/useController';
import { DataTable } from '@/components/DataTable';
import { CrudToolbar } from '@/components/CrudToolbar';
import { AsyncBoundary } from '@/components/AsyncBoundary';
import { Modal } from '@/components/Modal';
import { TextField, SelectField } from '@/components/Field';
import { FilterBar, FilterField } from '@/components/FilterBar';
import { BranchDirectoryStore } from '@/stores/BranchDirectoryStore';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { SalesController } from './SalesController';
import { SaleForm } from './components/SaleForm';
import { saleStatusLabel } from './constants';
import './Sales.css';

const COLUMNS_FOR = (controller) => [
  {
    key: 'saleNumber',
    header: 'Número de venta',
    render: (row) => <Link to={`/ventas/${row.saleId}`}>{row.saleNumber}</Link>,
  },
  { key: 'saleDate', header: 'Fecha', render: (row) => formatDateTime(row.saleDate) },
  { key: 'branch', header: 'Sucursal', render: (row) => controller.branchName(row.branchId) },
  { key: 'customer', header: 'Cliente', render: (row) => row.customerName ?? 'Mostrador (sin cliente)' },
  { key: 'seller', header: 'Responsable', render: (row) => row.sellerName ?? '—' },
  { key: 'product', header: 'Producto', render: (row) => `${row.productSku} — ${row.productName}` },
  { key: 'quantity', header: 'Cantidad', align: 'right' },
  { key: 'unitPrice', header: 'Precio unitario', align: 'right', render: (row) => formatCurrency(row.unitPrice) },
  { key: 'subtotal', header: 'Subtotal', align: 'right', render: (row) => formatCurrency(row.subtotal) },
  { key: 'status', header: 'Estado', render: (row) => saleStatusLabel(row.status) },
];

export default function SalesPage() {
  const controller = useController(SalesController);
  const form = controller.form;
  const filters = controller.filters.value;

  const branchOptions = BranchDirectoryStore.all.value.map((b) => ({ value: b.id, label: b.name }));
  const customerOptions = controller.customers.value.map((c) => ({ value: c.id, label: c.name }));

  return (
    <main>
      <h1>Ventas</h1>

      <CrudToolbar label="Registrar venta" onCreate={form.open} />

      <AsyncBoundary loading={controller.loading.value}>
        <FilterBar onSubmit={(event) => controller.search(event)}>
          <FilterField>
            <TextField
              label="Número de venta"
              value={filters.saleNumber}
              onChange={(value) => controller.setFilter('saleNumber', value)}
              placeholder="Filtra los resultados"
            />
          </FilterField>
          <FilterField>
            <SelectField
              label="Sucursal"
              value={filters.branchId}
              onChange={(value) => controller.setFilter('branchId', value)}
              options={branchOptions}
              placeholder="Todas"
            />
          </FilterField>
          <FilterField>
            <SelectField
              label="Cliente"
              value={filters.customerId}
              onChange={(value) => controller.setFilter('customerId', value)}
              options={customerOptions}
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
            columns={COLUMNS_FOR(controller)}
            rows={controller.filteredResults.value}
            rowKey={(row, index) => `${row.saleId}-${row.productId}-${index}`}
            empty="No hay ventas que coincidan con los filtros."
          />
        </div>
      </AsyncBoundary>

      {form.visible.value && (
        <Modal title="Registrar venta" onClose={form.close} size="wide">
          <SaleForm controller={form} />
        </Modal>
      )}
    </main>
  );
}
