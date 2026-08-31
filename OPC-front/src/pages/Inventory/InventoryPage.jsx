import { useController } from '@/lib/useController';
import { DataTable } from '@/components/DataTable';
import { AsyncBoundary } from '@/components/AsyncBoundary';
import { SearchBar } from '@/components/SearchBar';
import { InventoryController } from './InventoryController';
import { alertLabel } from './constants';
import './InventoryPage.css';

export default function InventoryPage() {
  const controller = useController(InventoryController);
  const stockByProduct = controller.inventoryByProductId.value;

  const columns = [
    { key: 'sku', header: 'SKU' },
    { key: 'name', header: 'Nombre' },
    {
      key: 'stock',
      header: 'Stock actual',
      render: (product) => stockByProduct[product.id]?.currentQuantity ?? '—',
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

        <DataTable columns={columns} rows={controller.filtered.value} empty="No hay productos." />
      </AsyncBoundary>
    </main>
  );
}
