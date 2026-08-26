import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import httpClient from '../api/httpClient';
import { useAuth } from '../hooks/useAuth';

const EMPTY_ITEM = { productId: '', quantity: '', unitPrice: '', discount: '' };

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function PurchaseOrderFormPage() {
  const { branches: ownBranches } = useAuth();
  const navigate = useNavigate();

  const [suppliers, setSuppliers] = useState([]);
  const [availableBranches, setAvailableBranches] = useState([]);
  const [products, setProducts] = useState([]);

  const [supplierId, setSupplierId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);

  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (ownBranches === null) return;

    Promise.all([
      httpClient.get('/api/suppliers'),
      httpClient.get('/api/branches'),
      httpClient.get('/api/products/catalog'),
    ]).then(([suppliersRes, branchesRes, productsRes]) => {
      setSuppliers(suppliersRes.data.filter((supplier) => supplier.active));
      const branches = Array.isArray(ownBranches)
        ? branchesRes.data.filter((branch) => ownBranches.includes(branch.id))
        : branchesRes.data;
      setAvailableBranches(branches);
      setProducts(productsRes.data);
      setSupplierId((current) => current || suppliersRes.data[0]?.id || '');
      setBranchId((current) => current || branches[0]?.id || '');
    });
  }, [ownBranches]);

  const lineSubtotals = useMemo(
    () => items.map((item) => toNumber(item.quantity) * toNumber(item.unitPrice) - toNumber(item.discount)),
    [items],
  );

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + toNumber(item.quantity) * toNumber(item.unitPrice), 0);
    const totalDiscount = items.reduce((sum, item) => sum + toNumber(item.discount), 0);
    return { subtotal, totalDiscount, total: subtotal - totalDiscount };
  }, [items]);

  const updateItem = (index, field, value) => {
    setItems((current) => current.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const addItem = () => setItems((current) => [...current, { ...EMPTY_ITEM }]);

  const removeItem = (index) => setItems((current) => current.filter((_, i) => i !== index));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    if (!items.every((item) => item.productId && toNumber(item.quantity) > 0 && toNumber(item.unitPrice) >= 0)) {
      setError('Cada ítem necesita producto, cantidad positiva y precio unitario válido.');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await httpClient.post('/api/purchase-orders', {
        supplierId: Number(supplierId),
        branchId: Number(branchId),
        paymentTerms: paymentTerms || null,
        items: items.map((item) => ({
          productId: Number(item.productId),
          quantity: toNumber(item.quantity),
          unitPrice: toNumber(item.unitPrice),
          discount: toNumber(item.discount),
        })),
      });
      navigate(`/compras/${data.id}`, { replace: true });
    } catch (submitError) {
      setError(submitError.response?.data?.message ?? 'No se pudo crear la orden de compra.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main>
      <h1>Nueva orden de compra</h1>

      <form onSubmit={handleSubmit} noValidate>
        <label htmlFor="supplier">Proveedor</label>
        <select id="supplier" value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}
            </option>
          ))}
        </select>

        <label htmlFor="branch">Sucursal</label>
        <select id="branch" value={branchId} onChange={(event) => setBranchId(event.target.value)}>
          {availableBranches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>

        <label htmlFor="paymentTerms">Plazo de pago</label>
        <input
          id="paymentTerms"
          value={paymentTerms}
          onChange={(event) => setPaymentTerms(event.target.value)}
          placeholder="ej. 30 días"
        />

        <h2>Ítems</h2>
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Precio unitario</th>
              <th>Descuento</th>
              <th>Subtotal</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index}>
                <td>
                  <select value={item.productId} onChange={(event) => updateItem(index, 'productId', event.target.value)}>
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
                    onChange={(event) => updateItem(index, 'quantity', event.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.unitPrice}
                    onChange={(event) => updateItem(index, 'unitPrice', event.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.discount}
                    onChange={(event) => updateItem(index, 'discount', event.target.value)}
                  />
                </td>
                <td>{lineSubtotals[index].toFixed(2)}</td>
                <td>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(index)}>
                      Quitar
                    </button>
                  )}
                </td>
              </tr>
            ))}
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

        {error && <p role="alert">{error}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Creando…' : 'Crear orden'}
        </button>
      </form>
    </main>
  );
}
