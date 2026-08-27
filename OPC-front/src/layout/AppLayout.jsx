import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './AppLayout.css';

const GENERAL_ADMIN_ROLE = 'GENERAL_ADMIN';

export default function AppLayout() {
  const { role, email, logout } = useAuth();
  const isAdmin = role === GENERAL_ADMIN_ROLE;

  return (
    <div>
      <header className="app-header">
        <nav className="app-nav">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/inventario">Inventario</Link>
          <Link to="/movimientos">Movimientos</Link>
          <Link to="/compras">Compras</Link>
          <Link to="/ventas/nueva">Ventas</Link>
          {isAdmin && (
            <>
              <Link to="/usuarios">Usuarios</Link>
              <Link to="/sucursales">Sucursales</Link>
              <Link to="/proveedores">Proveedores</Link>
              <Link to="/catalogo">Catálogo</Link>
              <Link to="/listas-precios">Listas de precios</Link>
              <Link to="/clientes">Clientes</Link>
              <Link to="/ventas/historico">Histórico de ventas</Link>
              <Link to="/auditoria">Auditoría</Link>
            </>
          )}
        </nav>
        <div className="app-session">
          {email && <span>{email}</span>}
          <button type="button" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
