// Iconos de línea simples (trazo, sin relleno) para el riel de navegación y
// puntos sueltos de la UI — nunca emoji, para que escalen y hereden color
// (currentColor) igual que el resto del sistema de diseño.

const base = {
  width: 19,
  height: 19,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export function DashboardIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

export function InventoryIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M3 7l9-4 9 4-9 4-9-4z" />
      <path d="M3 7v10l9 4 9-4V7" />
      <path d="M12 11v10" />
    </svg>
  );
}

export function MovementsIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M8 6h12l-3-3" />
      <path d="M17 3v6" />
      <path d="M16 18H4l3 3" />
      <path d="M7 21v-6" />
    </svg>
  );
}

export function PurchasesIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="17" cy="20" r="1.4" />
      <path d="M3 4h2l2.2 12a2 2 0 002 1.6h7a2 2 0 002-1.7L20 8H6.2" />
    </svg>
  );
}

export function SalesIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3l8 8-9 9-8-8 9-9z" />
      <circle cx="9" cy="9" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function TransfersIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="2" y="9" width="6" height="6" />
      <rect x="16" y="9" width="6" height="6" />
      <path d="M8 10h6l-2-2M14 8v4" />
      <path d="M16 15H10l2 2M10 17v-4" />
    </svg>
  );
}

export function ComplianceIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 19a8 8 0 0116 0" />
      <path d="M12 19l4.5-6.5" />
      <circle cx="12" cy="19" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function UsersIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5 20c1.4-4.2 5-5.6 7-5.6s5.6 1.4 7 5.6" />
    </svg>
  );
}

export function BranchesIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="5" y="3" width="14" height="18" />
      <path d="M9 8h1M14 8h1M9 12h1M14 12h1M9 16h1M14 16h1" />
    </svg>
  );
}

export function SuppliersIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="2" y="8" width="11" height="8" />
      <path d="M13 11h4l3 3v2h-7" />
      <circle cx="6" cy="18" r="1.6" />
      <circle cx="17" cy="18" r="1.6" />
    </svg>
  );
}

export function CatalogIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 7h16M4 12h16M4 17h10" />
    </svg>
  );
}

export function PriceListIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3l8 8-9 9-8-8 9-9z" />
      <path d="M9.5 8.5l5 5" />
    </svg>
  );
}

export function CustomersIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="8" r="2.6" />
      <circle cx="17" cy="9.2" r="2.1" />
      <path d="M3 20c1-3.4 3.6-5 6-5s5 1.6 6 5" />
      <path d="M14.5 15c2 .3 3.8 1.7 4.7 5" />
    </svg>
  );
}

export function HistoryIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M12 7.5v4.7l3.2 1.9" />
    </svg>
  );
}

export function AuditIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3l7 3v6c0 5-3.4 7.4-7 8.7C8.4 19.4 5 17 5 12V6l7-3z" />
    </svg>
  );
}

export function SearchIcon(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}>
      <circle cx="11" cy="11" r="6" />
      <path d="M21 21l-4-4" />
    </svg>
  );
}

export function LogoutIcon(props) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
    </svg>
  );
}
