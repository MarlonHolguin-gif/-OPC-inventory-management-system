import { AsyncBoundary } from '@/components/AsyncBoundary';
import { SelectField } from '@/components/Field';
import { TRANSFER_URGENCY_LABELS } from '../constants';

const URGENCY_OPTIONS = Object.entries(TRANSFER_URGENCY_LABELS).map(([value, label]) => ({ value, label }));

const branchOptions = (branches) => branches.map((branch) => ({ value: branch.id, label: branch.name }));

export function TransferForm({ controller }) {
  const items = controller.items.value;
  const products = controller.products.value;

  return (
    <AsyncBoundary loading={controller.loading.value}>
      <form className="op-form" onSubmit={(event) => controller.submit(event)} noValidate>
        <SelectField
          label="Sucursal destino (la que recibe)"
          value={controller.destinationBranchId.value}
          onChange={controller.setDestination}
          options={branchOptions(controller.destinationOptions.value)}
          placeholder={null}
        />
        <SelectField
          label="Sucursal origen (la que envía)"
          value={controller.originBranchIdValue.value}
          onChange={controller.setOrigin}
          options={branchOptions(controller.originOptions.value)}
          placeholder={null}
        />
        <SelectField
          label="Urgencia"
          value={controller.urgency.value}
          onChange={controller.setUrgency}
          options={URGENCY_OPTIONS}
          placeholder={null}
        />

        <h3>Ítems solicitados</h3>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cantidad</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index}>
                  <td>
                    <select
                      value={item.productId}
                      onChange={(event) => controller.updateItem(index, 'productId', event.target.value)}
                    >
                      <option value="">— elegir —</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.sku} — {product.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={item.quantity}
                      onChange={(event) => controller.updateItem(index, 'quantity', event.target.value)}
                    />
                  </td>
                  <td>
                    {items.length > 1 && (
                      <button type="button" onClick={() => controller.removeItem(index)}>
                        Quitar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button type="button" onClick={controller.addItem}>
          + Agregar ítem
        </button>

        <div className="form-actions">
          <button type="submit" disabled={controller.submitting.value}>
            {controller.submitting.value ? 'Enviando…' : 'Solicitar transferencia'}
          </button>
          <button type="button" onClick={controller.close}>
            Cancelar
          </button>
        </div>
      </form>
    </AsyncBoundary>
  );
}
