import { useEffect, useState } from 'react';
import httpClient from '../api/httpClient';

const EMPTY_FILTERS = { branchId: '', productId: '', customerId: '', sellerId: '', from: '', to: '' };

export default function SalesHistoryPage() {
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  const search = async (event) => {
    event?.preventDefault();
    setError(null);
    setSearching(true);
    try {
      const params = {};
      if (filters.branchId) params.branchId = filters.branchId;
      if (filters.productId) params.productId = filters.productId;
      if (filters.customerId) params.customerId = filters.customerId;
      if (filters.sellerId) params.sellerId = filters.sellerId;
      if (filters.from) params.from = `${filters.from}T00:00:00`;
      if (filters.to) params.to = `${filters.to}T23:59:59`;

      const { data } = await httpClient.get('/api/sales/history', { params });
      setResults(data);
    } catch {
      setError('No se pudo consultar el histórico de ventas.');
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    Promise.all([
      httpClient.get('/api/branches'),
      httpClient.get('/api/products/catalog'),
      httpClient.get('/api/customers'),
      httpClient.get('/api/users'),
      httpClient.get('/api/sales/history'),
    ])
      .then(([branchesRes, productsRes, customersRes, usersRes, historyRes]) => {
        setBranches(branchesRes.data);
        setProducts(productsRes.data);
        setCustomers(customersRes.data);
        setUsers(usersRes.data);
        setResults(historyRes.data);
      })
      .catch(() => setError('No se pudo cargar la información de filtros.'))
      .finally(() => setLoading(false));
  }, []);

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
  };

  const branchName = (id) => branches.find((branch) => branch.id === id)?.name ?? '—';
  const sellerName = (id) => users.find((user) => user.id === id)?.name ?? '—';

  if (loading) return <main>Cargando…</main>;

  return (
    <main>
      <h1>Histórico de ventas</h1>
      {error && <p role="alert">{error}</p>}

      <form onSubmit={search} noValidate>
        <label htmlFor="branchId">Sucursal</label>
        <select
          id="branchId"
          value={filters.branchId}
          onChange={(event) => setFilters({ ...filters, branchId: event.target.value })}
        >
          <option value="">Todas</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>

        <label htmlFor="productId">Producto</label>
        <select
          id="productId"
          value={filters.productId}
          onChange={(event) => setFilters({ ...filters, productId: event.target.value })}
        >
          <option value="">Todos</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.sku} — {product.name}
            </option>
          ))}
        </select>

        <label htmlFor="customerId">Cliente</label>
        <select
          id="customerId"
          value={filters.customerId}
          onChange={(event) => setFilters({ ...filters, customerId: event.target.value })}
        >
          <option value="">Todos</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </select>

        <label htmlFor="sellerId">Responsable</label>
        <select
          id="sellerId"
          value={filters.sellerId}
          onChange={(event) => setFilters({ ...filters, sellerId: event.target.value })}
        >
          <option value="">Todos</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>

        <label htmlFor="from">Desde</label>
        <input
          id="from"
          type="date"
          value={filters.from}
          onChange={(event) => setFilters({ ...filters, from: event.target.value })}
        />

        <label htmlFor="to">Hasta</label>
        <input
          id="to"
          type="date"
          value={filters.to}
          onChange={(event) => setFilters({ ...filters, to: event.target.value })}
        />

        <button type="submit" disabled={searching}>
          {searching ? 'Buscando…' : 'Filtrar'}
        </button>
        <button type="button" onClick={clearFilters}>
          Limpiar filtros
        </button>
      </form>

      <hr />

      <table>
        <thead>
          <tr>
            <th>Nº venta</th>
            <th>Fecha</th>
            <th>Sucursal</th>
            <th>Cliente</th>
            <th>Responsable</th>
            <th>Producto</th>
            <th>Cantidad</th>
            <th>Precio unit.</th>
            <th>Subtotal</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {results.map((row, index) => (
            <tr key={`${row.saleId}-${row.productId}-${index}`}>
              <td>{row.saleNumber}</td>
              <td>{row.saleDate?.slice(0, 10)}</td>
              <td>{branchName(row.branchId)}</td>
              <td>{row.customerName ?? '— mostrador —'}</td>
              <td>{sellerName(row.sellerId)}</td>
              <td>
                {row.productSku} — {row.productName}
              </td>
              <td>{row.quantity}</td>
              <td>{row.unitPrice}</td>
              <td>{row.subtotal}</td>
              <td>{row.status}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {results.length === 0 && <p>No hay ventas que coincidan con los filtros.</p>}
    </main>
  );
}
