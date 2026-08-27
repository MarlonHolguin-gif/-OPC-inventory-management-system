import { useEffect, useMemo, useState } from 'react';
import httpClient from '../api/httpClient';
import { useAuth } from '../hooks/useAuth';

const EMPTY_ITEM = { productId: '', quantity: '', discountPct: '' };

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isVigente(priceList) {
  if (!priceList.active) return false;
  const today = new Date().toISOString().slice(0, 10);
  if (priceList.startDate && today < priceList.startDate) return false;
  if (priceList.endDate && today > priceList.endDate) return false;
  return true;
}

export default function SaleFormPage() {
  const { branches: ownBranches } = useAuth();

  const [availableBranches, setAvailableBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [priceLists, setPriceLists] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [inventoryByProductId, setInventoryByProductId] = useState(new Map());

  const [branchId, setBranchId] = useState('');
  const [priceListId, setPriceListId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);

  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ownBranches === null) return;

    Promise.all([
      httpClient.get('/api/branches'),
      httpClient.get('/api/products/catalog'),
      httpClient.get('/api/price-lists'),
      httpClient.get('/api/customers'),
    ])
      .then(([branchesRes, productsRes, priceListsRes, customersRes]) => {
        const branches = Array.isArray(ownBranches)
          ? branchesRes.data.filter((branch) => ownBranches.includes(branch.id))
          : branchesRes.data;
        setAvailableBranches(branches);
        setProducts(productsRes.data);
        const vigentPriceLists = priceListsRes.data.filter(isVigente);
        setPriceLists(vigentPriceLists);
        setCustomers(customersRes.data.filter((customer) => customer.active));
        setBranchId((current) => current || branches[0]?.id || '');
        setPriceListId((current) => current || vigentPriceLists[0]?.id || '');
      })
      .catch(() => setError('No se pudo cargar la información necesaria para registrar la venta.'))
      .finally(() => setLoading(false));
  }, [ownBranches]);

  useEffect(() => {
    if (!branchId) return;
    httpClient
      .get(`/api/inventario/sucursal/${branchId}`)
      .then(({ data }) => {
        const map = new Map();
        data.forEach((entry) => map.set(entry.productId, entry.currentQuantity));
        setInventoryByProductId(map);
      })
      .catch(() => setError('No se pudo cargar el stock de la sucursal seleccionada.'));
  }, [branchId]);

  const selectedPriceList = useMemo(
    () => priceLists.find((list) => list.id === Number(priceListId)),
    [priceLists, priceListId],
  );

  const priceByProductId = useMemo(() => {
    const map = new Map();
    (selectedPriceList?.items ?? []).forEach((item) => map.set(item.productId, item.price));
    return map;
  }, [selectedPriceList]);

  const lineDetails = useMemo(
    () =>
      items.map((item) => {
        const productId = Number(item.productId);
        const unitPrice = priceByProductId.get(productId);
        const quantity = toNumber(item.quantity);
        const discountPct = toNumber(item.discountPct);
        const hasPrice = unitPrice !== undefined;
        const gross = hasPrice ? quantity * unitPrice : 0;
        const subtotal = gross - (gross * discountPct) / 100;
        const availableStock = inventoryByProductId.get(productId);
        return { unitPrice, hasPrice, subtotal, availableStock };
      }),
    [items, priceByProductId, inventoryByProductId],
  );

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item, index) => {
      const unitPrice = lineDetails[index].unitPrice ?? 0;
      return sum + toNumber(item.quantity) * unitPrice;
    }, 0);
    const totalDiscount = items.reduce((sum, item, index) => {
      const unitPrice = lineDetails[index].unitPrice ?? 0;
      const gross = toNumber(item.quantity) * unitPrice;
      return sum + (gross * toNumber(item.discountPct)) / 100;
    }, 0);
    return { subtotal, totalDiscount, total: subtotal - totalDiscount };
  }, [items, lineDetails]);

  const updateItem = (index, field, value) => {
    setItems((current) => current.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const addItem = () => setItems((current) => [...current, { ...EMPTY_ITEM }]);

  const removeItem = (index) => setItems((current) => current.filter((_, i) => i !== index));

  const validate = () => {
    if (!priceListId) return 'Selecciona una lista de precios vigente.';
    for (const item of items) {
      if (!item.productId) return 'Cada ítem necesita un producto seleccionado.';
      const quantity = toNumber(item.quantity);
      if (quantity <= 0 || !Number.isInteger(quantity)) {
        return 'La cantidad debe ser un número entero mayor que cero.';
      }
      if (!priceByProductId.has(Number(item.productId))) {
        const product = products.find((p) => p.id === Number(item.productId));
        return `El producto ${product?.name ?? item.productId} no tiene precio en la lista seleccionada.`;
      }
    }
    return null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await httpClient.post('/api/sales', {
        branchId: Number(branchId),
        priceListId: Number(priceListId),
        customerId: customerId ? Number(customerId) : null,
        items: items.map((item) => ({
          productId: Number(item.productId),
          quantity: toNumber(item.quantity),
          discountPct: item.discountPct ? toNumber(item.discountPct) : null,
        })),
      });
      setSuccessMessage(`Venta ${data.saleNumber} registrada correctamente. Total: ${data.total}`);
      setItems([{ ...EMPTY_ITEM }]);
      setCustomerId('');
      httpClient
        .get(`/api/inventario/sucursal/${branchId}`)
        .then(({ data: inventoryData }) => {
          const map = new Map();
          inventoryData.forEach((entry) => map.set(entry.productId, entry.currentQuantity));
          setInventoryByProductId(map);
        });
    } catch (submitError) {
      setError(submitError.response?.data?.message ?? 'No se pudo registrar la venta.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <main>Cargando…</main>;

  return (
    <main>
      <h1>Registrar venta</h1>

      {error && <p role="alert">{error}</p>}
      {successMessage && <p>{successMessage}</p>}

      <form onSubmit={handleSubmit} noValidate>
        <label htmlFor="branch">Sucursal</label>
        <select id="branch" value={branchId} onChange={(event) => setBranchId(event.target.value)}>
          {availableBranches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>

        <label htmlFor="priceList">Lista de precios</label>
        <select id="priceList" value={priceListId} onChange={(event) => setPriceListId(event.target.value)}>
          {priceLists.length === 0 && <option value="">— no hay listas vigentes —</option>}
          {priceLists.map((list) => (
            <option key={list.id} value={list.id}>
              {list.name}
            </option>
          ))}
        </select>

        <label htmlFor="customer">Cliente</label>
        <select id="customer" value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
          <option value="">— Venta de mostrador (sin cliente) —</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </select>

        <h2>Ítems</h2>
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Stock disponible</th>
              <th>Cantidad</th>
              <th>Descuento %</th>
              <th>Precio unitario</th>
              <th>Subtotal</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const detail = lineDetails[index];
              const quantity = toNumber(item.quantity);
              const insufficientStock = detail.availableStock !== undefined && quantity > detail.availableStock;
              return (
                <tr key={index}>
                  <td>
                    <select
                      value={item.productId}
                      onChange={(event) => updateItem(index, 'productId', event.target.value)}
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
                    {item.productId ? detail.availableStock ?? 0 : '—'}
                  </td>
                  <td>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={item.quantity}
                      onChange={(event) => updateItem(index, 'quantity', event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={item.discountPct}
                      onChange={(event) => updateItem(index, 'discountPct', event.target.value)}
                    />
                  </td>
                  <td>{item.productId ? (detail.hasPrice ? detail.unitPrice : 'sin precio') : '—'}</td>
                  <td>{detail.subtotal.toFixed(2)}</td>
                  <td>
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(index)}>
                        Quitar
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <button type="button" onClick={addItem}>
          + Agregar ítem
        </button>

        <div>
          <p>Subtotal: {totals.subtotal.toFixed(2)}</p>
          <p>Descuento total: {totals.totalDiscount.toFixed(2)}</p>
          <p>
            <strong>Total: {totals.total.toFixed(2)}</strong>
          </p>
        </div>

        <button type="submit" disabled={submitting}>
          {submitting ? 'Registrando…' : 'Confirmar venta'}
        </button>
      </form>
    </main>
  );
}
