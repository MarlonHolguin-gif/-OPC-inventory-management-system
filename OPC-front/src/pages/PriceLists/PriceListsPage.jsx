import { useController } from '@/lib/useController';
import { DataTable } from '@/components/DataTable';
import { CrudToolbar } from '@/components/CrudToolbar';
import { AsyncBoundary } from '@/components/AsyncBoundary';
import { Modal } from '@/components/Modal';
import { isCurrentlyValid } from '@/lib/format';
import { PriceListsController } from './PriceListsController';
import { PriceListForm } from './components/PriceListForm';
import { PriceListItemsPanel } from './components/PriceListItemsPanel';

function validityBadge(priceList) {
  const valid = isCurrentlyValid(priceList);
  return (
    <span className={`badge ${valid ? 'badge-ok' : 'badge-bad'}`}>
      {valid ? 'Vigente hoy' : 'No vigente'}
    </span>
  );
}

const COLUMNS = [
  { key: 'name', header: 'Nombre' },
  { key: 'validity', header: 'Vigencia', render: validityBadge },
  { key: 'startDate', header: 'Desde' },
  { key: 'endDate', header: 'Hasta' },
  { key: 'active', header: 'Estado', render: (l) => (l.active ? 'Activa' : 'Inactiva') },
];

export default function PriceListsPage() {
  const controller = useController(PriceListsController);
  const form = controller.form;
  const panel = controller.itemsPanel;

  return (
    <main>
      <h1>Listas de precios</h1>

      <AsyncBoundary variant="screen" loading={controller.loading.value}>
        <DataTable
          columns={COLUMNS}
          rows={controller.items.value}
          empty="No hay listas de precios."
          actions={(priceList) => (
            <>
              <button type="button" onClick={() => form.startEdit(priceList)}>
                Editar
              </button>
              <button type="button" onClick={() => panel.open(priceList.id)}>
                Gestionar ítems
              </button>
              {priceList.active ? (
                <button type="button" onClick={() => controller.deactivate(priceList.id)}>
                  Desactivar
                </button>
              ) : (
                <button type="button" onClick={() => controller.reactivate(priceList.id)}>
                  Reactivar
                </button>
              )}
            </>
          )}
        />

        <CrudToolbar label="Nueva lista de precios" onCreate={form.openCreate} />

        {form.visible.value && (
          <Modal
            title={form.isEditing ? 'Editar lista de precios' : 'Nueva lista de precios'}
            onClose={form.close}
          >
            <PriceListForm form={form} />
          </Modal>
        )}

        {panel.list.value && (
          <Modal
            title={`Ítems de "${panel.list.value.name}"`}
            onClose={panel.close}
            size="wide"
          >
            <PriceListItemsPanel controller={panel} products={controller.products.value} />
          </Modal>
        )}
      </AsyncBoundary>
    </main>
  );
}
