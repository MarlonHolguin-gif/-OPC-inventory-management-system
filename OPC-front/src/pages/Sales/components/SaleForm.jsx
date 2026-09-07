import { AsyncBoundary } from '@/components/AsyncBoundary';
import { SelectField } from '@/components/Field';
import { SaleItemsTable } from './SaleItemsTable';

export function SaleForm({ controller }) {
  const totals = controller.totals.value;

  const branchOptions = controller.availableBranches.value.map((b) => ({ value: b.id, label: b.name }));
  const priceListOptions = controller.priceLists.value.map((l) => ({ value: l.id, label: l.name }));
  const customerOptions = controller.customers.value.map((c) => ({ value: c.id, label: c.name }));

  return (
    <AsyncBoundary loading={controller.loading.value}>
      <form className="op-form sale-form" onSubmit={(event) => controller.submit(event)} noValidate>
        <div className="op-form-head">
          <div>
            <SelectField
              label="Sucursal"
              value={controller.branchId.value}
              onChange={controller.setBranchId}
              options={branchOptions}
              placeholder={null}
            />
          </div>
          <div>
            <SelectField
              label="Lista de precios"
              value={controller.priceListId.value}
              onChange={controller.setPriceListId}
              options={priceListOptions}
              placeholder={priceListOptions.length === 0 ? '— no hay listas vigentes —' : null}
            />
          </div>
          <div>
            <SelectField
              label="Cliente"
              value={controller.customerId.value}
              onChange={controller.setCustomerId}
              options={customerOptions}
              placeholder="— Venta de mostrador (sin cliente) —"
            />
          </div>
        </div>

        <div className="op-items">
          <div className="table-scroll">
            <SaleItemsTable controller={controller} />
          </div>
          <button
            type="button"
            className="op-add-item"
            onClick={controller.addItem}
            disabled={!controller.canAddItem.value}
          >
            + Agregar ítem
          </button>
        </div>

        <div className="op-totals">
          <span>Subtotal: {totals.subtotal.toFixed(2)}</span>
          <span>Descuento total: {totals.totalDiscount.toFixed(2)}</span>
          <span>
            <strong>Total: {totals.total.toFixed(2)}</strong>
          </span>
        </div>

        {controller.hasStockShortage.value && (
          <p className="sale-form-warning">
            Hay líneas con una cantidad mayor al stock disponible en la sucursal.
          </p>
        )}

        <div className="form-actions">
          <button
            type="submit"
            disabled={controller.submitting.value || controller.hasStockShortage.value}
          >
            {controller.submitting.value ? 'Registrando…' : 'Confirmar venta'}
          </button>
          <button type="button" onClick={controller.close}>
            Cancelar
          </button>
        </div>
      </form>
    </AsyncBoundary>
  );
}
