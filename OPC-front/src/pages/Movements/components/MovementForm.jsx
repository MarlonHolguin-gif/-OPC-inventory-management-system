import { AsyncBoundary } from '@/components/AsyncBoundary';
import { SelectField } from '@/components/Field';
import { MOVEMENT_TYPES } from '../constants';

export function MovementForm({ controller }) {
  const fieldErrors = controller.fieldErrors.value;

  const branchOptions = controller.availableBranches.value.map((b) => ({ value: b.id, label: b.name }));
  const productOptions = controller.products.value.map((p) => ({
    value: p.id,
    label: `${p.sku} — ${p.name}`,
  }));

  return (
    <AsyncBoundary loading={controller.loading.value}>
      <form onSubmit={(event) => controller.submit(event)} noValidate>
        <SelectField
          label="Sucursal"
          value={controller.branchId.value}
          onChange={controller.setBranchId}
          options={branchOptions}
          placeholder={null}
        />
        <SelectField
          label="Producto"
          value={controller.productId.value}
          onChange={controller.setProductId}
          options={productOptions}
          placeholder={null}
        />
        <SelectField
          label="Tipo de movimiento"
          value={controller.movementType.value}
          onChange={controller.setMovementType}
          options={MOVEMENT_TYPES}
          placeholder={null}
        />

        <label htmlFor="movementQuantity">Cantidad</label>
        <input
          id="movementQuantity"
          type="number"
          step="1"
          min="1"
          value={controller.quantity.value}
          onChange={(event) => controller.setQuantity(event.target.value)}
        />
        {fieldErrors.quantity && <p role="alert">{fieldErrors.quantity}</p>}

        <label htmlFor="movementReason">Motivo</label>
        <input
          id="movementReason"
          type="text"
          value={controller.reason.value}
          onChange={(event) => controller.setReason(event.target.value)}
        />
        {fieldErrors.reason && <p role="alert">{fieldErrors.reason}</p>}

        <div className="form-actions">
          <button type="submit" disabled={controller.submitting.value}>
            {controller.submitting.value ? 'Registrando…' : 'Registrar movimiento'}
          </button>
          <button type="button" onClick={controller.close}>
            Cancelar
          </button>
        </div>
      </form>
    </AsyncBoundary>
  );
}
