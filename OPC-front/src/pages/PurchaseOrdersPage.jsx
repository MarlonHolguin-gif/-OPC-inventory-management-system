import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import httpClient from '../api/httpClient';

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    httpClient
      .get('/api/purchase-orders')
      .then(({ data }) => setOrders(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <main>Cargando…</main>;

  return (
    <main>
      <h1>Órdenes de compra</h1>
      <Link to="/compras/nueva">+ Nueva orden de compra</Link>

      <table>
        <thead>
          <tr>
            <th>Número</th>
            <th>Proveedor</th>
            <th>Fecha</th>
            <th>Estado</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td>
                <Link to={`/compras/${order.id}`}>{order.orderNumber}</Link>
              </td>
              <td>{order.supplierName}</td>
              <td>{new Date(order.orderDate).toLocaleDateString()}</td>
              <td>{order.status}</td>
              <td>{order.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
