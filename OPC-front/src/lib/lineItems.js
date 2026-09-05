/**
 * Helpers para las tablas de ítems de una orden (venta, compra,
 * transferencia). Un mismo producto no puede ir en dos líneas de la misma
 * orden: el backend la rechaza y, en transferencias, el despacho se traba
 * al intentar descontar dos veces el stock del origen.
 */

const productIdOf = (item) => item.productId;

// ¿El id apunta a un producto ya elegido? Descarta '', null y undefined.
const isChosen = (id) => id !== '' && id !== 'null' && id !== 'undefined';

/**
 * Productos que todavía no se eligieron en otra línea (conserva el de la
 * línea `currentIndex` para no ocultar su propia selección).
 */
export function availableLineProducts(products, items, currentIndex, idOf = productIdOf) {
  const taken = new Set(
    items
      .filter((_, index) => index !== currentIndex)
      .map((item) => String(idOf(item)))
      .filter(isChosen),
  );
  return products.filter((product) => !taken.has(String(product.id)));
}

/** ¿Hay algún producto repetido entre las líneas ya completadas? */
export function hasDuplicateProducts(items, idOf = productIdOf) {
  const chosen = items.map((item) => String(idOf(item))).filter(isChosen);
  return new Set(chosen).size !== chosen.length;
}
