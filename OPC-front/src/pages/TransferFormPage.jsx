import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import httpClient from '../api/httpClient';
import { useAuth } from '../hooks/useAuth';
import { TRANSFER_URGENCY_LABELS } from '../constants/transfers';

const EMPTY_ITEM = { productId: '', quantity: '' };

// La escritura la autoriza el backend contra la sucursal DESTINO (o
// ADMIN_GENERAL sin restricción) — ver TransferService.create(). Por eso el
// selector de destino se limita a las sucursales propias del usuario y el
// de origen queda abierto a cualquier otra sucursal activa.
export default function TransferFormPage() {
  const { branches: ownBranches } = useAuth();
  const navigate = useNavigate();

  const [allBranches, setAllBranches] = useState([]);
  const [destinationOptions, setDestinationOptions] = useState([]);
  const [products, setProducts] = useState([]);

  const [originBranchId, setOriginBranchId] = useState('');
  const [destinationBranchId, setDestinationBranchId] = useState('');
  const [urgency, setUrgency] = useState('MEDIUM');
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);

  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (ownBranches === null) return;

    Promise.all([httpClient.get('/api/branches'), httpClient.get('/api/products/catalog')]).then(
      ([branchesRes, productsRes]) => {
        const activeBranches = branchesRes.data.filter((branch) => branch.active);
        setAllBranches(activeBranches);
        const destinations = Array.isArray(ownBranches)
          ? activeBranches.filter((branch) => ownBranches.includes(branch.id))
          : activeBranches;
        setDestinationOptions(destinations);
        setProducts(productsRes.data);
        setDestinationBranchId((current) => current || destinations[0]?.id || '');
      },
    );
  }, [ownBranches]);

  // La sucursal origen no puede ser la misma que la destino. Se deriva en
  // cada render en vez de sincronizarse con un efecto: si la elección
  // guardada dejó de ser válida (cambió el destino), cae al primer
  // disponible sin necesidad de un setState adicional.
  const originOptions = allBranches.filter((branch) => String(branch.id) !== String(destinationBranchId));
  const originBranchIdValue = originOptions.some((branch) => String(branch.id) === String(originBranchId))
    ? originBranchId
    : (originOptions[0]?.id ?? '');

  const updateItem = (index, field, value) => {
    setItems((current) => current.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const addItem = () => setItems((current) => [...current, { ...EMPTY_ITEM }]);

  const removeItem = (index) => setItems((current) => current.filter((_, i) => i !== index));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    if (!originBranchIdValue || !destinationBranchId) {
      setError('Selecciona sucursal de origen y de destino.');
      return;
    }
    if (!items.every((item) => item.productId && Number(item.quantity) > 0)) {
      setError('Cada ítem necesita producto y una cantidad positiva.');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await httpClient.post('/api/transfers', {
        originBranchId: Number(originBranchIdValue),
        destinationBranchId: Number(destinationBranchId),
        urgency,
        items: items.map((item) => ({ productId: Number(item.productId), quantity: Number(item.quantity) })),
      });
      navigate(`/transferencias/${data.id}`, { replace: true });
    } catch (submitError) {
      setError(submitError.response?.data?.message ?? 'No se pudo crear la solicitud de transferencia.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main>
      <h1>Solicitar transferencia</h1>

      <form onSubmit={handleSubmit} noValidate>
        <label htmlFor="destination">Sucursal destino (la que recibe)</label>
        <select id="destination" value={destinationBranchId} onChange={(event) => setDestinationBranchId(event.target.value)}>
          {destinationOptions.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>

        <label htmlFor="origin">Sucursal origen (la que envía)</label>
        <select id="origin" value={originBranchIdValue} onChange={(event) => setOriginBranchId(event.target.value)}>
          {originOptions.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>

        <label htmlFor="urgency">Urgencia</label>
        <select id="urgency" value={urgency} onChange={(event) => setUrgency(event.target.value)}>
          {Object.entries(TRANSFER_URGENCY_LABELS).map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>

        <h2>Ítems solicitados</h2>
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Cantidad</th>
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

        {error && <p role="alert">{error}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Enviando…' : 'Solicitar transferencia'}
        </button>
      </form>
    </main>
  );
}
