import { AsyncBoundary } from '@/components/AsyncBoundary';
import { SelectField } from '@/components/Field';
import { IntegerInput } from '@/components/IntegerInput';
import { TRANSFER_URGENCY_LABELS } from '../constants';

const URGENCY_OPTIONS = Object.entries(TRANSFER_URGENCY_LABELS).map(([value, label]) => ({ value, label }));

const branchOptions = (branches) => branches.map((branch) => ({ value: branch.id, label: branch.name }));

const SHORTAGE_CELL = { color: 'var(--bad)', fontWeight: 'bold' };

export function TransferForm({ controller }) {
  const items = controller.items.value;
  const shortage = controller.hasStockShortage.value;

  return (
    <AsyncBoundary loading={controller.loading.value}>
      <form className="op-form" onSubmit={(event) => controller.submit(event)} noValidate>
        <div className="op-form-head">
          <div>
            <SelectField
              label="Sucursal destino (la que recibe)"
              value={controller.destinationBranchId.value}
              onChange={controller.setDestination}
              options={branchOptions(controller.destinationOptions.value)}
              placeholder={null}
            />
          </div>
          <div>
            <SelectField
              label="Sucursal origen (la que envía)"
              value={controller.originBranchIdValue.value}
              onChange={controller.setOrigin}
              options={branchOptions(controller.originOptions.value)}
              placeholder={null}
            />
          </div>
          <div>
            <SelectField
              label="Urgencia"
              value={controller.urgency.value}
              onChange={controller.setUrgency}
              options={URGENCY_OPTIONS}
              placeholder={null}
            />
          </div>
        </div>

        <div className="op-items">
          <div className="table-scroll">
            <table className="op-items-table">
              <colgroup>
                <col style={{ width: '44%' }} />
                <col style={{ width: '22%' }} />
                <col style={{ width: '21%' }} />
                <col style={{ width: '13%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Disponible en origen</th>
                  <th>Cantidad</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const available = controller.lineStock(item);
                  const insufficient =
                    available !== undefined && Number(item.quantity) > Number(available);
                  return (
                    <tr key={index}>
                      <td>
                        <select
                          value={item.productId}
                          onChange={(event) =>
                            controller.updateItem(index, 'productId', event.target.value)
                          }
                        >
                          <option value="">— elegir —</option>
                          {controller.availableProducts(index).map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.sku} — {product.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={insufficient ? SHORTAGE_CELL : undefined}>
                        {item.productId ? (available ?? '…') : '—'}
                      </td>
                      <td>
                        <IntegerInput
                          min="1"
                          value={item.quantity}
                          onChange={(event) =>
                            controller.updateItem(index, 'quantity', event.target.value)
                          }
                        />
                      </td>
                      <td>
                        {items.length > 1 && (
                          <button
                            type="button"
                            className="button-danger"
                            onClick={() => controller.removeItem(index)}
                          >
                            Quitar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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

        {shortage && (
          <p className="badge badge-bad">
            Alguna línea pide más de lo que hay en la sucursal de origen. El inventario es compartido: no
            se puede transferir lo que no existe.
          </p>
        )}

        <div className="form-actions">
          <button type="submit" disabled={controller.submitting.value || shortage}>
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
