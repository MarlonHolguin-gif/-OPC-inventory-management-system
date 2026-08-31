import { DataTable } from '@/components/DataTable';
import { AsyncBoundary } from '@/components/AsyncBoundary';
import { SelectField, CheckboxField } from '@/components/Field';

const COLUMNS = [
  {
    key: 'unit',
    header: 'Unidad',
    render: (row) => `${row.unitName} (${row.unitAbbreviation})`,
  },
  { key: 'conversionFactor', header: 'Factor de conversión' },
  { key: 'isPurchaseUnit', header: 'Compra', render: (row) => (row.isPurchaseUnit ? 'Sí' : 'No') },
  { key: 'isSaleUnit', header: 'Venta', render: (row) => (row.isSaleUnit ? 'Sí' : 'No') },
];

export function ProductUnitsPanel({ controller, units }) {
  const product = controller.product.value;
  const form = controller.form.value;

  const unitOptions = units.map((unit) => ({
    value: unit.id,
    label: `${unit.name} (${unit.abbreviation})`,
  }));

  return (
    <>
      <p>
        Base: {product.baseUnitAbbreviation} (factor 1, implícita). Las demás son unidades
        alternativas con su factor de conversión.
      </p>

      <AsyncBoundary loading={controller.loading.value}>
        <DataTable
          columns={COLUMNS}
          rows={controller.rows.value}
          rowKey={(row) => row.unitId}
          empty="Este producto no tiene unidades alternativas."
          actions={(row) => (
            <button type="button" onClick={() => controller.remove(row.unitId)}>
              Eliminar
            </button>
          )}
        />
      </AsyncBoundary>

      <form onSubmit={(event) => controller.submit(event)} noValidate>
        <h4>Agregar / actualizar unidad alternativa</h4>

        <SelectField
          label="Unidad"
          value={form.unitId}
          onChange={(value) => controller.setField('unitId', value)}
          options={unitOptions}
        />

        <label htmlFor="conversionFactor">
          Factor de conversión (cuántas unidades base equivalen a 1 de esta unidad)
        </label>
        <input
          id="conversionFactor"
          type="number"
          step="0.0001"
          min="0.0001"
          value={form.conversionFactor}
          onChange={(event) => controller.setField('conversionFactor', event.target.value)}
        />

        <CheckboxField
          label="Usar en compras"
          checked={form.isPurchaseUnit}
          onChange={(value) => controller.setField('isPurchaseUnit', value)}
        />
        <CheckboxField
          label="Usar en ventas"
          checked={form.isSaleUnit}
          onChange={(value) => controller.setField('isSaleUnit', value)}
        />

        <button type="submit">Guardar unidad</button>
      </form>
    </>
  );
}
