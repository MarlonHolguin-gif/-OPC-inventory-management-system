import { DataTable } from '@/components/DataTable';
import { CrudToolbar } from '@/components/CrudToolbar';
import { FormPanel } from '@/components/FormPanel';
import { Modal } from '@/components/Modal';
import { TextField, SelectField } from '@/components/Field';
import { BranchDirectoryStore } from '@/stores/BranchDirectoryStore';
import { ProductUnitsPanel } from './ProductUnitsPanel';

const COLUMNS = [
  { key: 'sku', header: 'SKU' },
  { key: 'name', header: 'Nombre' },
  { key: 'categoryName', header: 'Categoría' },
  { key: 'baseUnitAbbreviation', header: 'Unidad base' },
  { key: 'referencePrice', header: 'Precio ref.' },
  { key: 'active', header: 'Estado', render: (row) => (row.active ? 'Activo' : 'Inactivo') },
];

export function ProductsTab({ controller }) {
  const form = controller.productForm;
  const values = form.form.value;
  const selectedProduct = controller.productUnits.product.value;

  const categoryOptions = controller.categories.value.map((category) => ({
    value: category.id,
    label: category.name,
  }));
  const unitOptions = controller.units.value.map((unit) => ({
    value: unit.id,
    label: `${unit.name} (${unit.abbreviation})`,
  }));
  const branchOptions = BranchDirectoryStore.all.value.map((branch) => ({
    value: branch.id,
    label: branch.name,
  }));

  return (
    <section>
      <DataTable
        columns={COLUMNS}
        rows={controller.products.value}
        empty="No hay productos."
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

      <CrudToolbar label="Nuevo producto" onCreate={form.openCreate} />

      {form.visible.value && (
        <Modal title={form.isEditing ? 'Editar producto' : 'Nuevo producto'} onClose={form.close}>
          <FormPanel
            submitLabel={form.isEditing ? 'Guardar cambios' : 'Crear producto'}
            submitting={form.submitting.value}
            onSubmit={(event) => form.submit(event)}
            onCancel={form.close}
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
                  label="Sucursal del stock inicial"
                  value={values.initialStockBranchId}
                  onChange={(value) => form.setField('initialStockBranchId', value)}
                  options={branchOptions}
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
    </section>
  );
}
