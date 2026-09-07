import { useController } from '@/lib/useController';
import { DataTable } from '@/components/DataTable';
import { AsyncBoundary } from '@/components/AsyncBoundary';
import { Modal } from '@/components/Modal';
import { FilterBar, FilterField } from '@/components/FilterBar';
import { TextField, SelectField } from '@/components/Field';
import { isCurrentlyValid } from '@/lib/format';
import { PriceListsController } from './PriceListsController';
import { PriceListForm } from './components/PriceListForm';
import { PriceListItemsPanel } from './components/PriceListItemsPanel';
import './PriceLists.css';

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

const VALIDITY_OPTIONS = [
  { value: 'valid', label: 'Vigente hoy' },
  { value: 'invalid', label: 'No vigente' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Activa' },
  { value: 'inactive', label: 'Inactiva' },
];

export default function PriceListsPage() {
  const controller = useController(PriceListsController);
  const form = controller.form;
  const panel = controller.itemsPanel;
  const filter = controller.filter;
  const draft = filter.draft.value;

  return (
    <main className="price-lists-page">
      <FilterBar onSubmit={filter.apply}>
        <FilterField>
          <TextField
            label="Nombre"
            value={draft.name}
            onChange={(value) => filter.set('name', value)}
            placeholder="Filtra los resultados"
          />
        </FilterField>
        <FilterField>
          <SelectField
            label="Vigencia"
            value={draft.validity}
            onChange={(value) => filter.set('validity', value)}
            options={VALIDITY_OPTIONS}
            placeholder="Todas"
          />
        </FilterField>
        <FilterField>
          <SelectField
            label="Estado"
            value={draft.status}
            onChange={(value) => filter.set('status', value)}
            options={STATUS_OPTIONS}
            placeholder="Todos"
          />
        </FilterField>
        <FilterBar.Actions>
          <button type="submit">Filtrar</button>
          <button type="button" onClick={filter.clear}>
            Limpiar filtros
          </button>
        </FilterBar.Actions>
        <button type="button" className="button-link primary filter-bar-cta" onClick={form.openCreate}>
          + Nueva lista de precios
        </button>
      </FilterBar>

      <AsyncBoundary loading={controller.loading.value}>
        <div className="price-lists-table-card">
          <DataTable
            columns={COLUMNS}
            rows={controller.filtered.value}
            empty="No hay listas de precios que coincidan con los filtros"
            actions={(priceList) => (
              <>
                <button type="button" onClick={() => form.startEdit(priceList)}>
                  Editar
                </button>
                <button type="button" onClick={() => panel.open(priceList.id)}>
                  Gestionar ítems
                </button>
                {priceList.active ? (
                  <button
                    type="button"
                    className="button-danger"
                    onClick={() => controller.deactivate(priceList.id)}
                  >
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
        </div>
      </AsyncBoundary>

      {form.visible.value && (
        <Modal
          title={form.isEditing ? 'Editar lista de precios' : 'Nueva lista de precios'}
          onClose={form.close}
        >
          <PriceListForm form={form} />
        </Modal>
      )}

      {panel.list.value && (
        <Modal title={`Ítems de "${panel.list.value.name}"`} onClose={panel.close}>
          <PriceListItemsPanel controller={panel} products={controller.products.value} />
        </Modal>
      )}
    </main>
  );
}
