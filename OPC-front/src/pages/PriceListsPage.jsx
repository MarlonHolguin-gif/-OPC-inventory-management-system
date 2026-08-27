import { useEffect, useState } from 'react';
import httpClient from '../api/httpClient';

const EMPTY_FORM = { name: '', description: '', startDate: '', endDate: '' };
const EMPTY_ITEM_FORM = { productId: '', price: '' };

function isVigente(priceList) {
  if (!priceList.active) return false;
  const today = new Date().toISOString().slice(0, 10);
  if (priceList.startDate && today < priceList.startDate) return false;
  if (priceList.endDate && today > priceList.endDate) return false;
  return true;
}

export default function PriceListsPage() {
  const [priceLists, setPriceLists] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [selectedListId, setSelectedListId] = useState(null);
  const [itemForm, setItemForm] = useState(EMPTY_ITEM_FORM);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadPriceLists = () => {
    httpClient
      .get('/api/price-lists')
      .then(({ data }) => setPriceLists(data))
      .catch(() => setError('No se pudo cargar la lista de precios.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPriceLists();
    httpClient.get('/api/products/catalog').then(({ data }) => setProducts(data));
  }, []);

  const selectedList = priceLists.find((list) => list.id === selectedListId) ?? null;

  const startEdit = (priceList) => {
    setEditingId(priceList.id);
    setForm({
      name: priceList.name,
      description: priceList.description ?? '',
      startDate: priceList.startDate ?? '',
      endDate: priceList.endDate ?? '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    const payload = {
      name: form.name,
      description: form.description || null,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
    };

    try {
      if (editingId) {
        await httpClient.put(`/api/price-lists/${editingId}`, payload);
      } else {
        await httpClient.post('/api/price-lists', { ...payload, items: [] });
      }
      cancelEdit();
      loadPriceLists();
    } catch (submitError) {
      setError(submitError.response?.data?.message ?? 'No se pudo guardar la lista de precios.');
    }
  };

  const handleDeactivate = async (id) => {
    try {
      await httpClient.patch(`/api/price-lists/${id}/deactivate`);
      loadPriceLists();
    } catch {
      setError('No se pudo desactivar la lista de precios.');
    }
  };

  const handleReactivate = async (id) => {
    try {
      await httpClient.patch(`/api/price-lists/${id}/reactivate`);
      loadPriceLists();
    } catch {
      setError('No se pudo reactivar la lista de precios.');
    }
  };

  const handleUpsertItem = async (event) => {
    event.preventDefault();
    setError(null);
    try {
      await httpClient.post(`/api/price-lists/${selectedListId}/items`, {
        productId: Number(itemForm.productId),
        price: Number(itemForm.price),
      });
      setItemForm(EMPTY_ITEM_FORM);
      loadPriceLists();
    } catch (submitError) {
      setError(submitError.response?.data?.message ?? 'No se pudo guardar el precio del producto.');
    }
  };

  const handleRemoveItem = async (productId) => {
    setError(null);
    try {
      await httpClient.delete(`/api/price-lists/${selectedListId}/items/${productId}`);
      loadPriceLists();
    } catch (submitError) {
      setError(submitError.response?.data?.message ?? 'No se pudo eliminar el precio del producto.');
    }
  };

  if (loading) return <main>Cargando…</main>;

  return (
    <main>
      <h1>Listas de precios</h1>

      {error && <p role="alert">{error}</p>}

      <form onSubmit={handleSubmit} noValidate>
        <h2>{editingId ? 'Editar lista de precios' : 'Nueva lista de precios'}</h2>

        <label htmlFor="name">Nombre</label>
        <input
          id="name"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          required
        />

        <label htmlFor="description">Descripción</label>
        <input
          id="description"
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
        />

        <label htmlFor="startDate">Vigente desde</label>
        <input
          id="startDate"
          type="date"
          value={form.startDate}
          onChange={(event) => setForm({ ...form, startDate: event.target.value })}
        />

        <label htmlFor="endDate">Vigente hasta</label>
        <input
          id="endDate"
          type="date"
          value={form.endDate}
          onChange={(event) => setForm({ ...form, endDate: event.target.value })}
        />

        <button type="submit">{editingId ? 'Guardar cambios' : 'Crear lista'}</button>
        {editingId && (
          <button type="button" onClick={cancelEdit}>
            Cancelar
          </button>
        )}
      </form>

      <hr />

      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Vigencia</th>
            <th>Desde</th>
            <th>Hasta</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {priceLists.map((priceList) => (
            <tr key={priceList.id}>
              <td>{priceList.name}</td>
              <td>
                <span className={`badge ${isVigente(priceList) ? 'badge-ok' : 'badge-bad'}`}>
                  {isVigente(priceList) ? 'Vigente hoy' : 'No vigente'}
                </span>
              </td>
              <td>{priceList.startDate ?? '—'}</td>
              <td>{priceList.endDate ?? '—'}</td>
              <td>{priceList.active ? 'Activa' : 'Inactiva'}</td>
              <td>
                <button type="button" onClick={() => startEdit(priceList)}>
                  Editar
                </button>
                <button type="button" onClick={() => setSelectedListId(priceList.id)}>
                  Gestionar ítems
                </button>
                {priceList.active ? (
                  <button type="button" onClick={() => handleDeactivate(priceList.id)}>
                    Desactivar
                  </button>
                ) : (
                  <button type="button" onClick={() => handleReactivate(priceList.id)}>
                    Reactivar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedList && (
        <>
          <hr />
          <h2>Ítems de "{selectedList.name}"</h2>
          <button type="button" onClick={() => setSelectedListId(null)}>
            Cerrar
          </button>

          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Producto</th>
                <th>Precio</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {selectedList.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.productSku}</td>
                  <td>{item.productName}</td>
                  <td>{item.price}</td>
                  <td>
                    <button type="button" onClick={() => handleRemoveItem(item.productId)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <form onSubmit={handleUpsertItem} noValidate>
            <h3>Agregar / actualizar precio</h3>
            <label htmlFor="itemProduct">Producto</label>
            <select
              id="itemProduct"
              value={itemForm.productId}
              onChange={(event) => setItemForm({ ...itemForm, productId: event.target.value })}
            >
              <option value="">— elegir —</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.sku} — {product.name}
                </option>
              ))}
            </select>

            <label htmlFor="itemPrice">Precio</label>
            <input
              id="itemPrice"
              type="number"
              step="0.01"
              min="0"
              value={itemForm.price}
              onChange={(event) => setItemForm({ ...itemForm, price: event.target.value })}
            />

            <button type="submit">Guardar precio</button>
          </form>
        </>
      )}
    </main>
  );
}
