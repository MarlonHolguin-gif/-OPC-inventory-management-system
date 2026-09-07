import { IntegerInput } from '@/components/IntegerInput';

/**
 * Tabla editable de ítems de una orden de compra: producto, unidad de compra,
 * cantidad, precio por unidad, porcentaje de descuento y subtotal en vivo.
 *
 * Columnas de ancho fijo (colgroup + `table-layout: fixed`): ningún campo se
 * agranda al elegir una unidad de nombre largo; si no caben, el contenedor
 * `.table-scroll` desplaza horizontalmente.
 */
export function PurchaseItemsTable({ controller }) {
  const items = controller.items.value;
  const subtotals = controller.lineSubtotals.value;

  return (
    <table className="op-items-table">
      <colgroup>
        <col style={{ width: '23%' }} />
        <col style={{ width: '17%' }} />
        <col style={{ width: '13%' }} />
        <col style={{ width: '15%' }} />
        <col style={{ width: '12%' }} />
        <col style={{ width: '12%' }} />
        <col style={{ width: '8%' }} />
      </colgroup>
      <thead>
        <tr>
          <th>Producto</th>
          <th>Unidad de compra</th>
          <th>Cantidad</th>
          <th>Precio (por unidad)</th>
          <th>Descuento %</th>
          <th>Subtotal</th>
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
                {controller.availableProducts(index).map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.sku} — {product.name}
                  </option>
                ))}
              </select>
            </td>
            <td>
              <select
                value={item.unitId}
                onChange={(event) => controller.updateItem(index, 'unitId', event.target.value)}
                disabled={!item.productId}
              >
                {controller.unitOptionsFor(item).map((option) => (
                  <option key={option.value || 'base'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </td>
            <td>
              <IntegerInput
                min="1"
                value={item.quantity}
                onChange={(event) => controller.updateItem(index, 'quantity', event.target.value)}
              />
              {controller.baseEquivalentFor(item) ? (
                <div className="op-items-unit-hint">
                  = {controller.baseEquivalentFor(item)} en unidad base
                </div>
              ) : null}
            </td>
            <td>
              <IntegerInput
                min="0"
                value={item.unitPrice}
                onChange={(event) => controller.updateItem(index, 'unitPrice', event.target.value)}
              />
            </td>
            <td>
              <IntegerInput
                min="0"
                max="100"
                value={item.discountPercentage}
                onChange={(event) => controller.updateItem(index, 'discountPercentage', event.target.value)}
              />
            </td>
            <td>{subtotals[index].toFixed(2)}</td>
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
  );
}
