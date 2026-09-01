import { useController } from '@/lib/useController';
import { AsyncBoundary } from '@/components/AsyncBoundary';
import { DataTable } from '@/components/DataTable';
import { CrudToolbar } from '@/components/CrudToolbar';
import { Modal } from '@/components/Modal';
import { TextField, SelectField } from '@/components/Field';
import { FilterBar, FilterField } from '@/components/FilterBar';
import { BranchDirectoryStore } from '@/stores/BranchDirectoryStore';
import { formatDateTime } from '@/lib/format';
import { MovementsController } from './MovementsController';
import { MovementForm } from './components/MovementForm';
import { MOVEMENT_TYPE_FILTER_OPTIONS, movementTypeLabel } from './constants';
import './Movements.css';

const HISTORY_COLUMNS = (controller) => [
  { key: 'movementDate', header: 'Fecha', render: (row) => formatDateTime(row.movementDate) },
  { key: 'branch', header: 'Sucursal', render: (row) => controller.branchName(row.branchId) },
  { key: 'responsible', header: 'Responsable', render: (row) => row.responsibleName ?? '—' },
  { key: 'product', header: 'Producto', render: (row) => `${row.productSku} — ${row.productName}` },
  { key: 'movementType', header: 'Tipo de movimiento', render: (row) => movementTypeLabel(row.movementType) },
  { key: 'quantity', header: 'Cantidad', align: 'right', render: (row) => Number(row.quantity) },
  { key: 'reason', header: 'Motivo' },
];

export default function MovementsPage() {
  const controller = useController(MovementsController);
  const form = controller.form;
  const filters = controller.filters.value;

  const branchOptions = BranchDirectoryStore.all.value.map((b) => ({ value: b.id, label: b.name }));
  const productOptions = controller.products.value.map((p) => ({ value: p.id, label: `${p.sku} — ${p.name}` }));

  return (
    <main>
      <h1>Movimientos de inventario</h1>

      <CrudToolbar label="Registrar movimiento" onCreate={form.open} />

      <AsyncBoundary loading={controller.loading.value}>
        <FilterBar onSubmit={(event) => controller.search(event)}>
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
              label="Producto"
              value={filters.productId}
              onChange={(value) => controller.setFilter('productId', value)}
              options={productOptions}
              placeholder="Todos"
            />
          </FilterField>
          <FilterField>
            <SelectField
              label="Tipo de movimiento"
              value={filters.movementType}
              onChange={(value) => controller.setFilter('movementType', value)}
              options={MOVEMENT_TYPE_FILTER_OPTIONS}
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

        <p className="movement-history-scope">
          {controller.isAdmin.value
            ? 'Movimientos de todas las sucursales.'
            : 'Movimientos de tus sucursales asignadas.'}
        </p>

        <div className="table-scroll">
          <DataTable
            columns={HISTORY_COLUMNS(controller)}
            rows={controller.history.value}
            empty="No hay movimientos que coincidan con los filtros."
          />
        </div>
      </AsyncBoundary>

      {form.visible.value && (
        <Modal title="Registrar movimiento" onClose={form.close}>
          <MovementForm controller={form} />
        </Modal>
      )}
    </main>
  );
}
