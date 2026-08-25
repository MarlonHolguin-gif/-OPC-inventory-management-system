import { useEffect, useState } from 'react';
import httpClient from '../api/httpClient';
import { useAuth } from '../hooks/useAuth';

const MOVEMENT_TYPES = [
  { value: 'PURCHASE', label: 'Compra (ingreso)' },
  { value: 'SALE', label: 'Venta (retiro)' },
  { value: 'RETURN', label: 'Devolución (ingreso)' },
  { value: 'POSITIVE_ADJUSTMENT', label: 'Ajuste positivo (ingreso)' },
  { value: 'NEGATIVE_ADJUSTMENT', label: 'Ajuste negativo (retiro)' },
  { value: 'TRANSFER_IN', label: 'Transferencia recibida (ingreso)' },
  { value: 'TRANSFER_OUT', label: 'Transferencia enviada (retiro)' },
];

export default function MovementFormPage() {
  const { branches: ownBranches } = useAuth();

  const [availableBranches, setAvailableBranches] = useState([]);
  const [products, setProducts] = useState([]);

  const [branchId, setBranchId] = useState('');
  const [productId, setProductId] = useState('');
  const [movementType, setMovementType] = useState(MOVEMENT_TYPES[0].value);
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');

  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (ownBranches === null) return;

    Promise.all([httpClient.get('/api/branches'), httpClient.get('/api/products/catalog')]).then(
      ([branchesRes, productsRes]) => {
        const branches = Array.isArray(ownBranches)
          ? branchesRes.data.filter((branch) => ownBranches.includes(branch.id))
          : branchesRes.data;
        setAvailableBranches(branches);
        setProducts(productsRes.data);
        setBranchId((current) => current || branches[0]?.id || '');
        setProductId((current) => current || productsRes.data[0]?.id || '');
      },
    );
  }, [ownBranches]);

  const validate = () => {
    const errors = {};
    const parsedQuantity = Number(quantity);
    if (!quantity || Number.isNaN(parsedQuantity) || parsedQuantity <= 0) {
      errors.quantity = 'La cantidad debe ser un número positivo.';
    }
    if (!reason.trim()) {
      errors.reason = 'El motivo no puede estar vacío.';
    }
    return errors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError(null);
    setSuccessMessage(null);

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      await httpClient.post('/api/inventario/movimientos', {
        branchId: Number(branchId),
        productId: Number(productId),
        movementType,
        quantity: Number(quantity),
        reason: reason.trim(),
      });
      setSuccessMessage('Movimiento registrado correctamente.');
      setQuantity('');
      setReason('');
    } catch (error) {
      setSubmitError(error.response?.data?.message ?? 'No se pudo registrar el movimiento.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main>
      <h1>Registrar movimiento de inventario</h1>

      <form onSubmit={handleSubmit}>
        <label htmlFor="branch">Sucursal</label>
        <select id="branch" value={branchId} onChange={(event) => setBranchId(event.target.value)}>
          {availableBranches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>

        <label htmlFor="product">Producto</label>
        <select id="product" value={productId} onChange={(event) => setProductId(event.target.value)}>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.sku} — {product.name}
            </option>
          ))}
        </select>

        <label htmlFor="movementType">Tipo de movimiento</label>
        <select
          id="movementType"
          value={movementType}
          onChange={(event) => setMovementType(event.target.value)}
        >
          {MOVEMENT_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>

        <label htmlFor="quantity">Cantidad</label>
        <input
          id="quantity"
          type="number"
          step="0.0001"
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
        />
        {fieldErrors.quantity && <p role="alert">{fieldErrors.quantity}</p>}

        <label htmlFor="reason">Motivo</label>
        <input id="reason" type="text" value={reason} onChange={(event) => setReason(event.target.value)} />
        {fieldErrors.reason && <p role="alert">{fieldErrors.reason}</p>}

        {submitError && <p role="alert">{submitError}</p>}
        {successMessage && <p>{successMessage}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Registrando…' : 'Registrar movimiento'}
        </button>
      </form>
    </main>
  );
}
