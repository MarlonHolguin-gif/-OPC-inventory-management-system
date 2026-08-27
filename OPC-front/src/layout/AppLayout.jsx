import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { roleName } from '../constants/roles';
import { SunIcon, MoonIcon } from '../components/icons/UtilityIcons';
import {
  DashboardIcon,
  InventoryIcon,
  MovementsIcon,
  PurchasesIcon,
  SalesIcon,
  UsersIcon,
  BranchesIcon,
  SuppliersIcon,
  CatalogIcon,
  PriceListIcon,
  CustomersIcon,
  HistoryIcon,
  AuditIcon,
  LogoutIcon,
} from '../components/icons/NavIcons';
import './AppLayout.css';

const GENERAL_ADMIN_ROLE = 'GENERAL_ADMIN';

const OPERATION_ITEMS = [
  { to: '/dashboard', label: 'Panel', icon: DashboardIcon },
  { to: '/inventario', label: 'Inv.', icon: InventoryIcon },
  { to: '/movimientos', label: 'Mov.', icon: MovementsIcon },
  { to: '/compras', label: 'Compr.', icon: PurchasesIcon },
  { to: '/ventas/nueva', label: 'Ventas', icon: SalesIcon },
];

const ADMIN_ITEMS = [
  { to: '/usuarios', label: 'Usr.', icon: UsersIcon },
  { to: '/sucursales', label: 'Sucurs.', icon: BranchesIcon },
  { to: '/proveedores', label: 'Prov.', icon: SuppliersIcon },
  { to: '/catalogo', label: 'Catál.', icon: CatalogIcon },
  { to: '/listas-precios', label: 'Precios', icon: PriceListIcon },
  { to: '/clientes', label: 'Client.', icon: CustomersIcon },
  { to: '/ventas/historico', label: 'Histór.', icon: HistoryIcon },
  { to: '/auditoria', label: 'Audit.', icon: AuditIcon },
];

function RailItem({ to, label, icon: Icon }) {
  return (
    <NavLink to={to} className={({ isActive }) => `rail-item${isActive ? ' active' : ''}`} title={label}>
      <Icon />
      <span>{label.toUpperCase()}</span>
    </NavLink>
  );
}

export default function AppLayout() {
  const { role, email, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isAdmin = role === GENERAL_ADMIN_ROLE;
  const initials = email ? email.slice(0, 2).toUpperCase() : '··';

  return (
    <div className="app-shell">
      <aside className="app-rail">
        <div className="rail-logo" title="OptiPlant · Inventario">
          OP
        </div>

        <nav className="rail-nav">
          {OPERATION_ITEMS.map((item) => (
            <RailItem key={item.to} {...item} />
          ))}

          {isAdmin && (
            <>
              <div className="rail-divider" />
              {ADMIN_ITEMS.map((item) => (
                <RailItem key={item.to} {...item} />
              ))}
            </>
          )}
        </nav>

        <div className="rail-user" title={`${email ?? ''} — ${roleName(role)}`}>
          <button
            type="button"
            onClick={toggleTheme}
            className="theme-toggle"
            aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
          <div className="rail-avatar">{initials}</div>
          <button type="button" onClick={logout} className="rail-logout" aria-label="Cerrar sesión">
            <LogoutIcon />
          </button>
        </div>
      </aside>

      <div className="app-content">
        <Outlet />
      </div>
    </div>
  );
}
