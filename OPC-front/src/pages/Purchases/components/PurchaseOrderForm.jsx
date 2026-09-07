import { AsyncBoundary } from '@/components/AsyncBoundary';
import { TextField, SelectField } from '@/components/Field';
import { PurchaseItemsTable } from './PurchaseItemsTable';

function submitLabel(controller) {
  if (controller.submitting.value) return controller.editingId.value ? 'Guardando…' : 'Creando…';
  return controller.editingId.value ? 'Guardar cambios' : 'Crear orden';
}

export function PurchaseOrderForm({ controller }) {
  const totals = controller.totals.value;
  const supplierOptions = controller.suppliers.value.map((s) => ({ value: s.id, label: s.name }));
  const branchOptions = controller.availableBranches.value.map((b) => ({ value: b.id, label: b.name }));

  return (
    <AsyncBoundary loading={controller.loading.value}>
      <form className="op-form" onSubmit={(event) => controller.submit(event)} noValidate>
        <div className="op-form-head">
          <div>
            <SelectField
              label="Proveedor"
              value={controller.supplierId.value}
              onChange={controller.setSupplierId}
              options={supplierOptions}
              placeholder={null}
            />
          </div>
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
            <TextField
              label="Plazo de pago"
              value={controller.paymentTerms.value}
              onChange={controller.setPaymentTerms}
              placeholder="ej. 30 días"
            />
          </div>
        </div>

        <div className="op-items">
          <div className="table-scroll">
            <PurchaseItemsTable controller={controller} />
          </div>
          <button
            type="button"
            className="op-add-item button-add"
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

        <div className="form-actions">
          <button type="submit" disabled={controller.submitting.value}>
            {submitLabel(controller)}
          </button>
          <button type="button" onClick={controller.close}>
            Cancelar
          </button>
        </div>
      </form>
    </AsyncBoundary>
  );
}
