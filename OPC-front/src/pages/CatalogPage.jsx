import { useEffect, useState } from 'react';
import httpClient from '../api/httpClient';

const EMPTY_CATEGORY_FORM = { name: '', description: '' };
const EMPTY_UNIT_FORM = { name: '', abbreviation: '' };
const EMPTY_PRODUCT_FORM = { sku: '', name: '', description: '', categoryId: '', baseUnitId: '', referencePrice: '' };
const EMPTY_PRODUCT_UNIT_FORM = { unitId: '', conversionFactor: '', isPurchaseUnit: false, isSaleUnit: false };

const TABS = [
  { id: 'categorias', label: 'Categorías' },
  { id: 'unidades', label: 'Unidades de medida' },
  { id: 'productos', label: 'Productos' },
];

export default function CatalogPage() {
  const [activeTab, setActiveTab] = useState('categorias');

  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAll = () => {
    Promise.all([
      httpClient.get('/api/categories'),
      httpClient.get('/api/units'),
      httpClient.get('/api/products'),
    ])
      .then(([categoriesRes, unitsRes, productsRes]) => {
        setCategories(categoriesRes.data);
        setUnits(unitsRes.data);
        setProducts(productsRes.data);
      })
      .catch(() => setError('No se pudo cargar el catálogo.'))
      .finally(() => setLoading(false));
  };

  useEffect(loadAll, []);

  if (loading) return <main>Cargando…</main>;

  return (
    <main>
      <h1>Catálogo</h1>
      {error && <p role="alert">{error}</p>}

      <nav>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            disabled={activeTab === tab.id}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <hr />

      {activeTab === 'categorias' && (
        <CategoriesSection categories={categories} onChanged={loadAll} setError={setError} />
      )}
      {activeTab === 'unidades' && <UnitsSection units={units} onChanged={loadAll} setError={setError} />}
      {activeTab === 'productos' && (
        <ProductsSection
          products={products}
          categories={categories}
          units={units}
          onChanged={loadAll}
          setError={setError}
        />
      )}
    </main>
  );
}

function CategoriesSection({ categories, onChanged, setError }) {
  const [form, setForm] = useState(EMPTY_CATEGORY_FORM);
  const [editingId, setEditingId] = useState(null);

  const startEdit = (category) => {
    setEditingId(category.id);
    setForm({ name: category.name, description: category.description ?? '' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_CATEGORY_FORM);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    const payload = { name: form.name, description: form.description || null };
    try {
      if (editingId) {
        await httpClient.put(`/api/categories/${editingId}`, payload);
      } else {
        await httpClient.post('/api/categories', payload);
      }
      cancelEdit();
      onChanged();
    } catch (submitError) {
      setError(submitError.response?.data?.message ?? 'No se pudo guardar la categoría.');
    }
  };

  const handleDeactivate = async (id) => {
    setError(null);
    try {
      await httpClient.patch(`/api/categories/${id}/deactivate`);
      onChanged();
    } catch {
      setError('No se pudo desactivar la categoría.');
    }
  };

  return (
    <section>
      <form onSubmit={handleSubmit} noValidate>
        <h2>{editingId ? 'Editar categoría' : 'Nueva categoría'}</h2>

        <label htmlFor="categoryName">Nombre</label>
        <input
          id="categoryName"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          required
        />

        <label htmlFor="categoryDescription">Descripción</label>
        <input
          id="categoryDescription"
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
        />

        <button type="submit">{editingId ? 'Guardar cambios' : 'Crear categoría'}</button>
        {editingId && (
          <button type="button" onClick={cancelEdit}>
            Cancelar
          </button>
        )}
      </form>

      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Descripción</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => (
            <tr key={category.id}>
              <td>{category.name}</td>
              <td>{category.description ?? '—'}</td>
              <td>{category.active ? 'Activa' : 'Inactiva'}</td>
              <td>
                <button type="button" onClick={() => startEdit(category)}>
                  Editar
                </button>
                {category.active && (
                  <button type="button" onClick={() => handleDeactivate(category.id)}>
                    Desactivar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function UnitsSection({ units, onChanged, setError }) {
  const [form, setForm] = useState(EMPTY_UNIT_FORM);
  const [editingId, setEditingId] = useState(null);

  const startEdit = (unit) => {
    setEditingId(unit.id);
    setForm({ name: unit.name, abbreviation: unit.abbreviation });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_UNIT_FORM);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    try {
      if (editingId) {
        await httpClient.put(`/api/units/${editingId}`, form);
      } else {
        await httpClient.post('/api/units', form);
      }
      cancelEdit();
      onChanged();
    } catch (submitError) {
      setError(submitError.response?.data?.message ?? 'No se pudo guardar la unidad de medida.');
    }
  };

  return (
    <section>
      <form onSubmit={handleSubmit} noValidate>
        <h2>{editingId ? 'Editar unidad' : 'Nueva unidad de medida'}</h2>

        <label htmlFor="unitName">Nombre</label>
        <input
          id="unitName"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          required
        />

        <label htmlFor="unitAbbreviation">Abreviatura</label>
        <input
          id="unitAbbreviation"
          value={form.abbreviation}
          onChange={(event) => setForm({ ...form, abbreviation: event.target.value })}
          required
        />

        <button type="submit">{editingId ? 'Guardar cambios' : 'Crear unidad'}</button>
        {editingId && (
          <button type="button" onClick={cancelEdit}>
            Cancelar
          </button>
        )}
      </form>

      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Abreviatura</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {units.map((unit) => (
            <tr key={unit.id}>
              <td>{unit.name}</td>
              <td>{unit.abbreviation}</td>
              <td>
                <button type="button" onClick={() => startEdit(unit)}>
                  Editar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function ProductsSection({ products, categories, units, onChanged, setError }) {
  const [form, setForm] = useState(EMPTY_PRODUCT_FORM);
  const [editingId, setEditingId] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState(null);

  const startEdit = (product) => {
    setEditingId(product.id);
    setForm({
      sku: product.sku,
      name: product.name,
      description: product.description ?? '',
      categoryId: product.categoryId,
      baseUnitId: product.baseUnitId,
      referencePrice: product.referencePrice,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_PRODUCT_FORM);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    const payload = {
      name: form.name,
      description: form.description || null,
      categoryId: Number(form.categoryId),
      baseUnitId: Number(form.baseUnitId),
      referencePrice: form.referencePrice ? Number(form.referencePrice) : null,
    };

    try {
      if (editingId) {
        await httpClient.put(`/api/products/${editingId}`, payload);
      } else {
        await httpClient.post('/api/products', { ...payload, sku: form.sku });
      }
      cancelEdit();
      onChanged();
    } catch (submitError) {
      setError(submitError.response?.data?.message ?? 'No se pudo guardar el producto.');
    }
  };

  const handleDeactivate = async (id) => {
    setError(null);
    try {
      await httpClient.patch(`/api/products/${id}/deactivate`);
      onChanged();
    } catch {
      setError('No se pudo desactivar el producto.');
    }
  };

  const selectedProduct = products.find((product) => product.id === selectedProductId) ?? null;

  return (
    <section>
      <form onSubmit={handleSubmit} noValidate>
        <h2>{editingId ? 'Editar producto' : 'Nuevo producto'}</h2>

        <label htmlFor="productSku">SKU</label>
        <input
          id="productSku"
          value={form.sku}
          onChange={(event) => setForm({ ...form, sku: event.target.value })}
          disabled={Boolean(editingId)}
          required
        />

        <label htmlFor="productName">Nombre</label>
        <input
          id="productName"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          required
        />

        <label htmlFor="productDescription">Descripción</label>
        <input
          id="productDescription"
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
        />

        <label htmlFor="productCategory">Categoría</label>
        <select
          id="productCategory"
          value={form.categoryId}
          onChange={(event) => setForm({ ...form, categoryId: event.target.value })}
        >
          <option value="">— elegir —</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        <label htmlFor="productBaseUnit">Unidad base</label>
        <select
          id="productBaseUnit"
          value={form.baseUnitId}
          onChange={(event) => setForm({ ...form, baseUnitId: event.target.value })}
        >
          <option value="">— elegir —</option>
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.name} ({unit.abbreviation})
            </option>
          ))}
        </select>

        <label htmlFor="productReferencePrice">Precio referencial</label>
        <input
          id="productReferencePrice"
          type="number"
          step="0.01"
          min="0"
          value={form.referencePrice}
          onChange={(event) => setForm({ ...form, referencePrice: event.target.value })}
        />

        <button type="submit">{editingId ? 'Guardar cambios' : 'Crear producto'}</button>
        {editingId && (
          <button type="button" onClick={cancelEdit}>
            Cancelar
          </button>
        )}
      </form>

      <table>
        <thead>
          <tr>
            <th>SKU</th>
            <th>Nombre</th>
            <th>Categoría</th>
            <th>Unidad base</th>
            <th>Precio ref.</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              <td>{product.sku}</td>
              <td>{product.name}</td>
              <td>{product.categoryName}</td>
              <td>{product.baseUnitAbbreviation}</td>
              <td>{product.referencePrice ?? '—'}</td>
              <td>{product.active ? 'Activo' : 'Inactivo'}</td>
              <td>
                <button type="button" onClick={() => startEdit(product)}>
                  Editar
                </button>
                <button type="button" onClick={() => setSelectedProductId(product.id)}>
                  Gestionar unidades
                </button>
                {product.active && (
                  <button type="button" onClick={() => handleDeactivate(product.id)}>
                    Desactivar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedProduct && (
        <ProductUnitsPanel
          product={selectedProduct}
          units={units}
          onClose={() => setSelectedProductId(null)}
          setError={setError}
        />
      )}
    </section>
  );
}

function ProductUnitsPanel({ product, units, onClose, setError }) {
  const [productUnits, setProductUnits] = useState([]);
  const [form, setForm] = useState(EMPTY_PRODUCT_UNIT_FORM);
  const [loading, setLoading] = useState(true);

  const loadProductUnits = () => {
    httpClient
      .get(`/api/products/${product.id}/units`)
      .then(({ data }) => setProductUnits(data))
      .catch(() => setError('No se pudo cargar las unidades del producto.'))
      .finally(() => setLoading(false));
  };

  useEffect(loadProductUnits, [product.id, setError]);

  const handleUpsert = async (event) => {
    event.preventDefault();
    setError(null);
    try {
      await httpClient.post(`/api/products/${product.id}/units`, {
        unitId: Number(form.unitId),
        conversionFactor: Number(form.conversionFactor),
        isPurchaseUnit: form.isPurchaseUnit,
        isSaleUnit: form.isSaleUnit,
      });
      setForm(EMPTY_PRODUCT_UNIT_FORM);
      loadProductUnits();
    } catch (submitError) {
      setError(submitError.response?.data?.message ?? 'No se pudo guardar la unidad del producto.');
    }
  };

  const handleRemove = async (unitId) => {
    setError(null);
    try {
      await httpClient.delete(`/api/products/${product.id}/units/${unitId}`);
      loadProductUnits();
    } catch {
      setError('No se pudo eliminar la unidad del producto.');
    }
  };

  return (
    <>
      <hr />
      <h3>
        Unidades de "{product.name}" — base: {product.baseUnitAbbreviation} (factor 1, implícita)
      </h3>
      <button type="button" onClick={onClose}>
        Cerrar
      </button>

      {loading ? (
        <p>Cargando…</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Unidad</th>
              <th>Factor de conversión</th>
              <th>Compra</th>
              <th>Venta</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {productUnits.map((productUnit) => (
              <tr key={productUnit.unitId}>
                <td>
                  {productUnit.unitName} ({productUnit.unitAbbreviation})
                </td>
                <td>{productUnit.conversionFactor}</td>
                <td>{productUnit.isPurchaseUnit ? 'Sí' : 'No'}</td>
                <td>{productUnit.isSaleUnit ? 'Sí' : 'No'}</td>
                <td>
                  <button type="button" onClick={() => handleRemove(productUnit.unitId)}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <form onSubmit={handleUpsert} noValidate>
        <h4>Agregar / actualizar unidad alternativa</h4>

        <label htmlFor="productUnitId">Unidad</label>
        <select
          id="productUnitId"
          value={form.unitId}
          onChange={(event) => setForm({ ...form, unitId: event.target.value })}
        >
          <option value="">— elegir —</option>
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.name} ({unit.abbreviation})
            </option>
          ))}
        </select>

        <label htmlFor="conversionFactor">
          Factor de conversión (cuántas unidades base equivalen a 1 de esta unidad)
        </label>
        <input
          id="conversionFactor"
          type="number"
          step="0.0001"
          min="0.0001"
          value={form.conversionFactor}
          onChange={(event) => setForm({ ...form, conversionFactor: event.target.value })}
        />

        <label htmlFor="isPurchaseUnit">
          <input
            id="isPurchaseUnit"
            type="checkbox"
            checked={form.isPurchaseUnit}
            onChange={(event) => setForm({ ...form, isPurchaseUnit: event.target.checked })}
          />
          Usar en compras
        </label>

        <label htmlFor="isSaleUnit">
          <input
            id="isSaleUnit"
            type="checkbox"
            checked={form.isSaleUnit}
            onChange={(event) => setForm({ ...form, isSaleUnit: event.target.checked })}
          />
          Usar en ventas
        </label>

        <button type="submit">Guardar unidad</button>
      </form>
    </>
  );
}
