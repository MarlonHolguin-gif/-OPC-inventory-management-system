/**
 * Tabla editable de ítems de una orden de compra: producto, cantidad, precio
 * unitario, porcentaje de descuento y subtotal en vivo.
 */
export function PurchaseItemsTable({ controller }) {
  const items = controller.items.value;
  const products = controller.products.value;
  const subtotals = controller.lineSubtotals.value;

  return (
    <table>
      <thead>
        <tr>
          <th>Producto</th>
          <th>Cantidad</th>
          <th>Precio unitario</th>
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
