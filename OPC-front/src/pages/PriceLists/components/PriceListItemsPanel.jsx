import { DataTable } from '@/components/DataTable';
import { SelectField } from '@/components/Field';

const ITEM_COLUMNS = [
  { key: 'productSku', header: 'SKU' },
  { key: 'productName', header: 'Producto' },
  { key: 'price', header: 'Precio' },
];

export function PriceListItemsPanel({ controller, products }) {
  const list = controller.list.value;
  const itemForm = controller.itemForm.value;

  const productOptions = products.map((product) => ({
    value: product.id,
    label: `${product.sku} — ${product.name}`,
  }));

  return (
    <>
      <DataTable
        columns={ITEM_COLUMNS}
        rows={list.items}
        empty="Esta lista no tiene precios cargados."
        actions={(item) => (
          <button type="button" onClick={() => controller.remove(item.productId)}>
            Eliminar
          </button>
        )}
      />

      <form onSubmit={(event) => controller.upsert(event)} noValidate>
        <h3>Agregar / actualizar precio</h3>
        <SelectField
          label="Producto"
          value={itemForm.productId}
          onChange={(value) => controller.setItemField('productId', value)}
          options={productOptions}
        />
        <label htmlFor="priceListItemPrice">Precio</label>
        <input
          id="priceListItemPrice"
          type="number"
          step="0.01"
          min="0"
          value={itemForm.price}
          onChange={(event) => controller.setItemField('price', event.target.value)}
        />
        <button type="submit">Guardar precio</button>
      </form>
    </>
  );
}
