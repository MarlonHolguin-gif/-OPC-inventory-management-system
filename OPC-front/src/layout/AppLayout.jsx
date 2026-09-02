import { Fragment, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { AuthStore } from '@/stores/AuthStore';
import { ThemeStore } from '@/stores/ThemeStore';
import { UiStore } from '@/stores/UiStore';
import { roleName, GENERAL_ADMIN } from '@/constants/roles';
import { NAV_SECTIONS } from '@/app/routes';
import { SunIcon, MoonIcon } from '@/components/icons/UtilityIcons';
import { LogoutIcon } from '@/components/icons/NavIcons';
import NotificationBell from '@/components/NotificationBell/NotificationBell';
import { GlobalAlert } from '@/components/Alert';
import './AppLayout.css';

function RailItem({ to, label, icon: Icon }) {
  return (
    <NavLink to={to} className={({ isActive }) => `rail-item${isActive ? ' active' : ''}`} title={label}>
      <Icon />
      <span>{label}</span>
    </NavLink>
  );
}

export default function AppLayout() {
  const { pathname } = useLocation();

  // Los mensajes de UiStore son globales; al cambiar de módulo se descartan
  // (antes cada página tenía su propio estado de error local).
  useEffect(() => {
    UiStore.clear();
  }, [pathname]);

  const role = AuthStore.role.value;
  const email = AuthStore.email.value;
  const name = AuthStore.name.value;
  const theme = ThemeStore.theme.value;
  const isAdmin = role === GENERAL_ADMIN;
  const initials = (name ?? email) ? (name ?? email).slice(0, 2).toUpperCase() : '··';

  const sections = NAV_SECTIONS.filter((section) => !section.adminOnly || isAdmin).map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.notRoles || !item.notRoles.includes(role)),
  }));

  return (
    <div className="app-shell">
      <aside className="app-rail">
        <div className="rail-logo" title="OptiPlant · Inventario">
          OP
        </div>

        <nav className="rail-nav">
          {sections.map((section, index) => (
            <Fragment key={section.id}>
              {index > 0 && <div className="rail-divider" />}
              {section.items.map((item) => (
                <RailItem key={item.to} {...item} />
              ))}
            </Fragment>
          ))}
        </nav>
      </aside>

      <div className="app-content">
        <header className="app-topbar" title={`${email ?? ''} — ${roleName(role)}`}>
          <span className="topbar-greeting">
            Buen día, <strong>{name ?? email ?? ''}</strong>
          </span>

          <div className="topbar-actions">
            <NotificationBell />
            <button
              type="button"
              onClick={ThemeStore.toggle}
              className="icon-button"
              aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
            <div className="rail-avatar">{initials}</div>
            <button
              type="button"
              onClick={AuthStore.logout}
              className="rail-logout"
              aria-label="Cerrar sesión"
            >
              <LogoutIcon />
            </button>
          </div>
        </header>

        <GlobalAlert />
        <Outlet />
      </div>
    </div>
  );
}
