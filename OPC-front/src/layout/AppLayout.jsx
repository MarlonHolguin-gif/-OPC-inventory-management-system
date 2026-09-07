import { Fragment, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { AuthStore } from '@/stores/AuthStore';
import { ThemeStore } from '@/stores/ThemeStore';
import { UiStore } from '@/stores/UiStore';
import { NavStore } from '@/stores/NavStore';
import { roleName, GENERAL_ADMIN } from '@/constants/roles';
import { NAV_SECTIONS } from '@/app/routes';
import {
  SunIcon,
  MoonIcon,
  MenuIcon,
  CollapseNavIcon,
  PinIcon,
} from '@/components/icons/UtilityIcons';
import { LogoutIcon } from '@/components/icons/NavIcons';
import NotificationBell from '@/components/NotificationBell/NotificationBell';
import { GlobalAlert } from '@/components/Alert';
import { BrandMark } from '@/components/BrandMark';
import { TopbarSlotContext } from './topbarSlotContext';
import './AppLayout.css';

// Retardo de intención: no desplegar el menú por rozarlo con el cursor, ni
// replegarlo por salir un instante.
const PEEK_OPEN_MS = 220;
const PEEK_CLOSE_MS = 320;

function RailItem({ to, label, icon: Icon }) {
  return (
    <NavLink to={to} className={({ isActive }) => `rail-item${isActive ? ' active' : ''}`} title={label}>
      <Icon />
      <span>{label}</span>
    </NavLink>
  );
}

// Etiqueta del botón que cicla el modo del riel, según el modo actual.
const CYCLE_LABEL = {
  expanded: 'Contraer a solo íconos',
  icons: 'Ocultar el menú',
  hidden: 'Mostrar el menú completo',
};

export default function AppLayout() {
  const { pathname } = useLocation();
  // Nodo del hueco de la barra superior; se resuelve tras el primer render
  // (ref callback -> estado) para que el contexto lo entregue a las páginas.
  const [topbarSlot, setTopbarSlot] = useState(null);
  const openTimer = useRef(null);
  const closeTimer = useRef(null);

  // Los mensajes de UiStore son globales; al cambiar de módulo se descartan
  // (antes cada página tenía su propio estado de error local).
  useEffect(() => {
    UiStore.clear();
    NavStore.setPeeking(false); // al navegar, el menú desplegado se repliega
  }, [pathname]);

  useEffect(
    () => () => {
      clearTimeout(openTimer.current);
      clearTimeout(closeTimer.current);
    },
    [],
  );

  const role = AuthStore.role.value;
  const email = AuthStore.email.value;
  const name = AuthStore.name.value;
  const theme = ThemeStore.theme.value;
  const isAdmin = role === GENERAL_ADMIN;
  const initials = (name ?? email) ? (name ?? email).slice(0, 2).toUpperCase() : '··';

  const navMode = NavStore.mode.value;
  const navPinned = NavStore.pinned.value;
  const railMode = NavStore.effectiveMode.value;
  const isPeeking = NavStore.isPeeking.value;
  // El riel puede "asomarse" al pasar el cursor solo si no está fijo y no
  // está ya expandido.
  const canPeek = !navPinned && navMode !== 'expanded';

  const scheduleOpen = () => {
    if (!canPeek) return;
    clearTimeout(closeTimer.current);
    if (NavStore.peeking.value) return;
    openTimer.current = setTimeout(() => NavStore.setPeeking(true), PEEK_OPEN_MS);
  };

  const scheduleClose = () => {
    clearTimeout(openTimer.current);
    closeTimer.current = setTimeout(() => NavStore.setPeeking(false), PEEK_CLOSE_MS);
  };

  const sections = NAV_SECTIONS.filter((section) => !section.adminOnly || isAdmin).map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.notRoles || !item.notRoles.includes(role)),
  }));

  return (
    <div className="app-shell" data-nav-mode={navMode}>
      {/* La ranura reserva el ancho del riel en el flujo (200 / 56 / 0); el
          riel vive dentro en posición absoluta y crece hacia la derecha al
          asomarse, sin mover el contenido. */}
      <div className="app-rail-slot" data-mode={navMode}>
        {/* Con el riel oculto no hay nada que rozar: una franja sensible al
            cursor en el borde izquierdo dispara el despliegue. En modo "solo
            íconos" el propio riel (56px) ya es el objetivo del hover. */}
        {canPeek && navMode === 'hidden' && (
          <div
            className="rail-peek-zone"
            onMouseEnter={scheduleOpen}
            aria-hidden="true"
          />
        )}

        <aside
          className="app-rail"
          data-mode={railMode}
          data-peeking={isPeeking ? 'true' : 'false'}
          onMouseEnter={scheduleOpen}
          onMouseLeave={scheduleClose}
        >
          <div className="rail-logo" title="OptiPlant Inventory">
            <BrandMark size={34} />
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

          <div className="rail-controls">
            <button
              type="button"
              className="rail-control-btn"
              onClick={NavStore.cycleMode}
              title={CYCLE_LABEL[navMode]}
              aria-label={CYCLE_LABEL[navMode]}
            >
              <CollapseNavIcon />
              <span>{CYCLE_LABEL[navMode]}</span>
            </button>
            <button
              type="button"
              className={`rail-control-btn${navPinned ? ' is-active' : ''}`}
              onClick={NavStore.togglePinned}
              title={
                navPinned
                  ? 'Menú fijo: no se despliega solo al pasar el cursor'
                  : 'Fijar el menú para que no se despliegue solo'
              }
              aria-pressed={navPinned}
            >
              <PinIcon />
              <span>{navPinned ? 'Menú fijo' : 'Fijar menú'}</span>
            </button>
          </div>
        </aside>
      </div>

      <div className="app-content">
        <header className="app-topbar" title={`${email ?? ''} — ${roleName(role)}`}>
          <div className="topbar-start">
            {navMode === 'hidden' && !isPeeking && (
              <button
                type="button"
                className="icon-button topbar-nav-toggle"
                onClick={() => NavStore.setMode('expanded')}
                aria-label="Mostrar el menú de navegación"
                title="Mostrar el menú de navegación"
              >
                <MenuIcon />
              </button>
            )}
            <span className="topbar-greeting">
              Buen día, <strong>{name ?? email ?? ''}</strong>
            </span>
            <div className="topbar-slot" ref={setTopbarSlot} />
          </div>

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
        <TopbarSlotContext.Provider value={topbarSlot}>
          <Outlet />
        </TopbarSlotContext.Provider>
      </div>
    </div>
  );
}
