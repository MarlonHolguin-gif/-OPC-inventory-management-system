/**
 * Tabla editable de ítems de una orden de compra: producto, unidad de compra,
 * cantidad, precio por unidad, porcentaje de descuento y subtotal en vivo.
 */
// Equivalente en unidad base bajo la casilla de cantidad — bloque propio para
// no ensanchar ni empujar el input.
const UNIT_HINT_STYLE = {
  marginTop: 2,
  fontSize: 11,
  fontFamily: 'var(--font-mono)',
  color: 'var(--text-dim)',
  whiteSpace: 'nowrap',
};

export function PurchaseItemsTable({ controller }) {
  const items = controller.items.value;
  const subtotals = controller.lineSubtotals.value;

  return (
    <table>
      <thead>
        <tr>
          <th>Producto</th>
          <th>Unidad de compra</th>
          <th>Cantidad</th>
          <th>Precio (por unidad de compra)</th>
          <th>Descuento (%)</th>
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
              <input
                type="number"
                step="1"
                min="1"
                value={item.quantity}
                onChange={(event) => controller.updateItem(index, 'quantity', event.target.value)}
              />
              {controller.baseEquivalentFor(item) ? (
                <div style={UNIT_HINT_STYLE}>= {controller.baseEquivalentFor(item)} en unidad base</div>
              ) : null}
            </td>
            <td>
              <input
                type="number"
                step="1"
                min="0"
                value={item.unitPrice}
                onChange={(event) => controller.updateItem(index, 'unitPrice', event.target.value)}
              />
            </td>
            <td>
              <input
                type="number"
                step="1"
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
