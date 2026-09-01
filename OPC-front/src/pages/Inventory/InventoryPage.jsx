import { useController } from '@/lib/useController';
import { DataTable } from '@/components/DataTable';
import { AsyncBoundary } from '@/components/AsyncBoundary';
import { SearchBar } from '@/components/SearchBar';
import { Modal } from '@/components/Modal';
import { FormPanel } from '@/components/FormPanel';
import { TextField } from '@/components/Field';
import { formatCurrency } from '@/lib/format';
import { InventoryController } from './InventoryController';
import { alertLabel } from './constants';
import './InventoryPage.css';

export default function InventoryPage() {
  const controller = useController(InventoryController);
  const threshold = controller.threshold;
  const stockByProduct = controller.inventoryByProductId.value;
  const canEdit = controller.canEditSelectedBranch.value;

  const columns = [
    { key: 'sku', header: 'SKU' },
    { key: 'name', header: 'Nombre' },
    {
      key: 'stock',
      header: 'Stock actual',
      align: 'right',
      render: (product) => stockByProduct[product.id]?.currentQuantity ?? '—',
    },
    {
      key: 'minStock',
      header: 'Mínimo',
      align: 'right',
      render: (product) => stockByProduct[product.id]?.minStock ?? '—',
    },
    {
      key: 'maxStock',
      header: 'Máximo',
      align: 'right',
      render: (product) => {
        const max = stockByProduct[product.id]?.maxStock;
        return max === undefined || Number(max) === 0 ? 'Sin tope' : max;
      },
    },
    {
      key: 'weightedAvgCost',
      header: 'Costo promedio ponderado',
      align: 'right',
      render: (product) => formatCurrency(stockByProduct[product.id]?.weightedAvgCost),
    },
    {
      key: 'alert',
      header: 'Estado',
      render: (product) => {
        const status = stockByProduct[product.id]?.alertStatus ?? 'NORMAL';
        return (
          <span className={`alert-badge alert-badge--${status.toLowerCase()}`}>{alertLabel(status)}</span>
        );
      },
    },
  ];

  return (
    <main>
      <h1>Inventario</h1>

      <AsyncBoundary loading={controller.loading.value}>
        <div className="inventory-toolbar">
          <SearchBar
            value={controller.search.value}
            onChange={controller.setSearch}
            placeholder="Buscar por nombre o SKU…"
            label="Buscar producto"
          />
          <label>
            Sucursal:{' '}
            <select value={controller.selectedBranchId.value ?? ''} onChange={(event) => controller.setBranch(event.target.value)}>
              {controller.allBranches.value.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <DataTable
          columns={columns}
          rows={controller.filtered.value}
          empty="No hay productos."
          actions={
            canEdit
              ? (product) => (
                  <button type="button" onClick={() => threshold.startEdit(product)}>
                    Editar umbrales
                  </button>
                )
              : undefined
          }
        />
      </AsyncBoundary>

      {threshold.visible.value && (
        <Modal title={`Umbrales — ${threshold.productName.value}`} onClose={threshold.close}>
          <FormPanel
            submitLabel="Guardar umbrales"
            submitting={threshold.submitting.value}
            onSubmit={(event) => threshold.submit(event)}
            onCancel={threshold.close}
          >
            <TextField
              label="Stock mínimo"
              type="number"
              min="0"
              step="1"
              value={threshold.form.value.minStock}
              onChange={(value) => threshold.setField('minStock', value)}
              required
            />
            <TextField
              label="Stock máximo (0 = sin tope)"
              type="number"
              min="0"
              step="1"
              value={threshold.form.value.maxStock}
              onChange={(value) => threshold.setField('maxStock', value)}
              required
            />
          </FormPanel>
        </Modal>
      )}
    </main>
  );
}
