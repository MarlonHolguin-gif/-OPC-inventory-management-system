import { DataTable } from '@/components/DataTable';
import { FormPanel } from '@/components/FormPanel';
import { Modal } from '@/components/Modal';
import { FilterBar, FilterField } from '@/components/FilterBar';
import { TextField, SelectField } from '@/components/Field';
import { BranchDirectoryStore } from '@/stores/BranchDirectoryStore';
import { ALL_BRANCHES } from '../controllers/ProductFormController';
import { ProductUnitsPanel } from './ProductUnitsPanel';

const COLUMNS = [
  { key: 'sku', header: 'SKU' },
  { key: 'name', header: 'Nombre' },
  { key: 'categoryName', header: 'Categoría' },
  { key: 'baseUnitAbbreviation', header: 'Unidad base' },
  { key: 'referencePrice', header: 'Precio referencial' },
  { key: 'active', header: 'Estado', render: (row) => (row.active ? 'Activo' : 'Inactivo') },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
];

export function ProductsTab({ controller }) {
  const form = controller.productForm;
  const values = form.form.value;
  const selectedProduct = controller.productUnits.product.value;
  const filter = controller.productFilter;
  const draft = filter.draft.value;

  // En el alta solo se ofrecen categorías/unidades activas; al editar se deja
  // además la que ya tiene el producto aunque esté inactiva, para no perder el
  // valor del select.
  const isSelectable = (entity, currentId) => entity.active || entity.id === currentId;

  const categoryOptions = controller.categories.value
    .filter((category) => isSelectable(category, values.categoryId))
    .map((category) => ({ value: category.id, label: category.name }));
  const unitOptions = controller.units.value
    .filter((unit) => isSelectable(unit, values.baseUnitId))
    .map((unit) => ({ value: unit.id, label: `${unit.name} (${unit.abbreviation})` }));
  const initialStockBranchOptions = [
    { value: ALL_BRANCHES, label: 'Todas las sucursales' },
    ...BranchDirectoryStore.all.value
      .filter((branch) => branch.active)
      .map((branch) => ({ value: branch.id, label: branch.name })),
  ];

  return (
    <div className="catalog-panel">
      <FilterBar onSubmit={filter.apply}>
        <FilterField>
          <TextField
            label="SKU"
            value={draft.sku}
            onChange={(value) => filter.set('sku', value)}
            placeholder="Filtra los resultados"
          />
        </FilterField>
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
            label="Categoría"
            value={draft.categoryId}
            onChange={(value) => filter.set('categoryId', value)}
            options={controller.categoryOptions.value}
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
          + Nuevo producto
        </button>
      </FilterBar>

      <div className="catalog-table-card">
        <DataTable
          columns={COLUMNS}
          rows={controller.filteredProducts.value}
          empty="No hay productos que coincidan con los filtros"
          actions={(product) => (
            <>
              <button type="button" onClick={() => form.startEdit(product)}>
                Editar
              </button>
              <button type="button" onClick={() => controller.productUnits.open(product)}>
                Gestionar unidades
              </button>
              {product.active ? (
                <button type="button" onClick={() => form.deactivate(product.id)}>
                  Desactivar
                </button>
              ) : (
                <button type="button" onClick={() => form.reactivate(product.id)}>
                  Reactivar
                </button>
              )}
            </>
          )}
        />
      </div>

      {form.visible.value && (
        <Modal title={form.isEditing ? 'Editar producto' : 'Nuevo producto'} onClose={form.close}>
          <FormPanel
            submitLabel={form.isEditing ? 'Guardar cambios' : 'Crear producto'}
            submitting={form.submitting.value}
            onSubmit={(event) => form.submit(event)}
            onCancel={form.close}
            error={form.error.value}
          >
            <TextField
              label="SKU"
              value={values.sku}
              onChange={(value) => form.setField('sku', value)}
              disabled={form.isEditing}
              required
            />
            <TextField
              label="Nombre"
              value={values.name}
              onChange={(value) => form.setField('name', value)}
              required
            />
            <TextField
              label="Descripción"
              value={values.description}
              onChange={(value) => form.setField('description', value)}
            />
            <SelectField
              label="Categoría"
              value={values.categoryId}
              onChange={(value) => form.setField('categoryId', value)}
              options={categoryOptions}
            />
            <SelectField
              label="Unidad base"
              value={values.baseUnitId}
              onChange={(value) => form.setField('baseUnitId', value)}
              options={unitOptions}
            />
            <TextField
              label="Precio referencial"
              type="number"
              step="1"
              min="0"
              value={values.referencePrice}
              onChange={(value) => form.setField('referencePrice', value)}
            />

            {!form.isEditing && (
              <>
                <TextField
                  label="Stock inicial (opcional)"
                  type="number"
                  step="1"
                  min="0"
                  value={values.initialStock}
                  onChange={(value) => form.setField('initialStock', value)}
                />
                {Number(values.initialStock) > 0 && (
                  <SelectField
                    label="Destino del stock inicial"
                    value={values.initialStockBranchId}
                    onChange={(value) => form.setField('initialStockBranchId', value)}
                    options={initialStockBranchOptions}
                  />
                )}
              </>
            )}
          </FormPanel>
        </Modal>
      )}

      {selectedProduct && (
        <Modal
          title={`Unidades de "${selectedProduct.name}"`}
          onClose={controller.productUnits.close}
          size="wide"
        >
          <ProductUnitsPanel controller={controller.productUnits} units={controller.units.value} />
        </Modal>
      )}
    </div>
  );
}
