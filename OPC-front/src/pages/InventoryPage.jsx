import { useEffect, useMemo, useState } from 'react';
import httpClient from '../api/httpClient';
import { useAuth } from '../hooks/useAuth';
import './InventoryPage.css';

const ALERT_LABELS = {
  LOW_STOCK: 'Stock bajo',
  HIGH_STOCK: 'Stock alto',
  NORMAL: 'Normal',
};

export default function InventoryPage() {
  const { branches: ownBranches } = useAuth();

  const [allBranches, setAllBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(null);
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Carga inicial: sucursales + catálogo. Espera a que /api/auth/me
  // resuelva (ownBranches deja de ser null) para poder elegir la
  // sucursal por defecto correctamente: la propia del usuario (primera
  // de su lista) o, si es admin ("todas") o no tiene ninguna asignada,
  // la primera sucursal que exista.
  useEffect(() => {
    if (ownBranches === null) return;

    Promise.all([
      httpClient.get('/api/branches'),
      httpClient.get('/api/products/catalog'),
    ])
      .then(([branchesRes, productsRes]) => {
        setAllBranches(branchesRes.data);
        setProducts(productsRes.data);

        const defaultBranchId = Array.isArray(ownBranches) && ownBranches.length > 0
          ? ownBranches[0]
          : branchesRes.data[0]?.id ?? null;
        setSelectedBranchId(defaultBranchId);
      })
      .catch(() => setError('No se pudo cargar el catálogo o las sucursales.'))
      .finally(() => setLoading(false));
  }, [ownBranches]);

  useEffect(() => {
    if (!selectedBranchId) return;
    httpClient
      .get(`/api/inventario/sucursal/${selectedBranchId}`)
      .then(({ data }) => setInventory(data))
      .catch(() => setError('No se pudo cargar el inventario de esa sucursal.'));
  }, [selectedBranchId]);

  const inventoryByProductId = useMemo(() => {
    const map = new Map();
    inventory.forEach((item) => map.set(item.productId, item));
    return map;
  }, [inventory]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(term) || product.sku.toLowerCase().includes(term),
    );
  }, [products, search]);

  if (loading) return <main>Cargando…</main>;

  return (
    <main>
      <h1>Inventario</h1>
      {error && <p role="alert">{error}</p>}

      <div className="inventory-toolbar">
        <input
          type="search"
          placeholder="Buscar por nombre o SKU…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Buscar producto"
        />

        <label>
          Sucursal:{' '}
          <select
            value={selectedBranchId ?? ''}
            onChange={(event) => setSelectedBranchId(Number(event.target.value))}
          >
            {allBranches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <table>
        <thead>
          <tr>
            <th>SKU</th>
            <th>Nombre</th>
            <th>Stock actual</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {filteredProducts.map((product) => {
            const stock = inventoryByProductId.get(product.id);
            const alertStatus = stock?.alertStatus ?? 'NORMAL';
            return (
              <tr key={product.id}>
                <td>{product.sku}</td>
                <td>{product.name}</td>
                <td>{stock ? stock.currentQuantity : '—'}</td>
                <td>
                  <span className={`alert-badge alert-badge--${alertStatus.toLowerCase()}`}>
                    {ALERT_LABELS[alertStatus]}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </main>
  );
}
