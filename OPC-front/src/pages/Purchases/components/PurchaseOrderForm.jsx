import { AsyncBoundary } from '@/components/AsyncBoundary';
import { TextField, SelectField } from '@/components/Field';
import { PurchaseItemsTable } from './PurchaseItemsTable';

export function PurchaseOrderForm({ controller }) {
  const totals = controller.totals.value;
  const supplierOptions = controller.suppliers.value.map((s) => ({ value: s.id, label: s.name }));
  const branchOptions = controller.availableBranches.value.map((b) => ({ value: b.id, label: b.name }));

  return (
    <AsyncBoundary loading={controller.loading.value}>
      <form className="op-form" onSubmit={(event) => controller.submit(event)} noValidate>
        <SelectField
          label="Proveedor"
          value={controller.supplierId.value}
          onChange={controller.setSupplierId}
          options={supplierOptions}
          placeholder={null}
        />
        <SelectField
          label="Sucursal"
          value={controller.branchId.value}
          onChange={controller.setBranchId}
          options={branchOptions}
          placeholder={null}
        />
        <TextField
          label="Plazo de pago"
          value={controller.paymentTerms.value}
          onChange={controller.setPaymentTerms}
          placeholder="ej. 30 días"
        />

        <h3>Ítems</h3>
        <div className="table-scroll">
          <PurchaseItemsTable controller={controller} />
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
            {controller.submitting.value ? 'Creando…' : 'Crear orden'}
          </button>
          <button type="button" onClick={controller.close}>
            Cancelar
          </button>
        </div>
      </form>
    </AsyncBoundary>
  );
}
