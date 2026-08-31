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
        <SelectField
          label="Sucursal"
          value={controller.branchId.value}
          onChange={controller.setBranchId}
          options={branchOptions}
          placeholder={null}
        />
        <SelectField
          label="Lista de precios"
          value={controller.priceListId.value}
          onChange={controller.setPriceListId}
          options={priceListOptions}
          placeholder={priceListOptions.length === 0 ? '— no hay listas vigentes —' : null}
        />
        <SelectField
          label="Cliente"
          value={controller.customerId.value}
          onChange={controller.setCustomerId}
          options={customerOptions}
          placeholder="— Venta de mostrador (sin cliente) —"
        />

        <h3>Ítems</h3>
        <div className="table-scroll">
          <SaleItemsTable controller={controller} />
        </div>

        <button type="button" onClick={controller.addItem}>
          + Agregar ítem
        </button>

        <div className="op-totals">
          <span>Subtotal: {totals.subtotal.toFixed(2)}</span>
          <span>Descuento total: {totals.totalDiscount.toFixed(2)}</span>
          <span>
            <strong>Total: {totals.total.toFixed(2)}</strong>
          </span>
        </div>

        <div className="form-actions">
          <button type="submit" disabled={controller.submitting.value}>
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
