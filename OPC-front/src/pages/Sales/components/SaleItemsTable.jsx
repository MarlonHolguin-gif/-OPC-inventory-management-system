import { toNumber } from '@/lib/format';

/**
 * Tabla editable de ítems de una venta: producto, stock disponible (resaltado
 * si la cantidad lo supera), cantidad, descuento %, precio de la lista y
 * subtotal en vivo.
 */
export function SaleItemsTable({ controller }) {
  const items = controller.items.value;
  const products = controller.products.value;
  const details = controller.lineDetails.value;

  return (
    <table>
      <thead>
        <tr>
          <th>Producto</th>
          <th>Stock disponible</th>
          <th>Cantidad</th>
          <th>Descuento %</th>
          <th>Precio unitario</th>
          <th>Subtotal</th>
          <th aria-label="Acciones" />
        </tr>
      </thead>
      <tbody>
        {items.map((item, index) => {
          const detail = details[index];
          const quantity = toNumber(item.quantity);
          const insufficientStock =
            detail.availableStock !== undefined && quantity > detail.availableStock;
          return (
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
              <td style={insufficientStock ? { color: 'var(--bad)', fontWeight: 'bold' } : undefined}>
                {item.productId ? (detail.availableStock ?? 0) : '—'}
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
                  max="100"
                  value={item.discountPct}
                  onChange={(event) => controller.updateItem(index, 'discountPct', event.target.value)}
                />
              </td>
              <td>{item.productId ? (detail.hasPrice ? detail.unitPrice : 'sin precio') : '—'}</td>
              <td>{detail.subtotal.toFixed(2)}</td>
              <td>
                {items.length > 1 && (
                  <button type="button" onClick={() => controller.removeItem(index)}>
                    Quitar
                  </button>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
