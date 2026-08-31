import { GENERAL_ADMIN } from '@/constants/roles';
import {
  DashboardIcon,
  InventoryIcon,
  MovementsIcon,
  PurchasesIcon,
  SalesIcon,
  TransfersIcon,
  UsersIcon,
  BranchesIcon,
  SuppliersIcon,
  CatalogIcon,
  PriceListIcon,
  CustomersIcon,
  AuditIcon,
} from '@/components/icons/NavIcons';

// Paths de ruta (no cambian: son URLs, no identificadores de código).
export const PATHS = {
  login: '/login',
  dashboard: '/dashboard',
  inventory: '/inventario',
  movements: '/movimientos',
  purchases: '/compras',
  purchaseDetail: '/compras/:orderId',
  sales: '/ventas',
  transfers: '/transferencias',
  transferDetail: '/transferencias/:transferId',
  logisticsCompliance: '/transferencias/cumplimiento',
  users: '/usuarios',
  branches: '/sucursales',
  suppliers: '/proveedores',
  priceLists: '/listas-precios',
  catalog: '/catalogo',
  customers: '/clientes',
  audit: '/auditoria',
};

// Rutas que solo puede ver el administrador general.
export const ADMIN_ROLES = [GENERAL_ADMIN];

// Rail de navegación lateral. `adminOnly` oculta la sección a los no-admin.
export const NAV_SECTIONS = [
  {
    id: 'operations',
    adminOnly: false,
    items: [
      { to: PATHS.dashboard, label: 'Panel', icon: DashboardIcon },
      { to: PATHS.inventory, label: 'Inventario', icon: InventoryIcon },
      { to: PATHS.movements, label: 'Movimientos', icon: MovementsIcon },
      { to: PATHS.purchases, label: 'Compras', icon: PurchasesIcon },
      { to: PATHS.sales, label: 'Ventas', icon: SalesIcon },
      { to: PATHS.transfers, label: 'Transferencias', icon: TransfersIcon },
    ],
  },
  {
    id: 'admin',
    adminOnly: true,
    items: [
      { to: PATHS.users, label: 'Usuarios', icon: UsersIcon },
      { to: PATHS.branches, label: 'Sucursales', icon: BranchesIcon },
      { to: PATHS.suppliers, label: 'Proveedores', icon: SuppliersIcon },
      { to: PATHS.catalog, label: 'Catálogo', icon: CatalogIcon },
      { to: PATHS.priceLists, label: 'Listas de precios', icon: PriceListIcon },
      { to: PATHS.customers, label: 'Clientes', icon: CustomersIcon },
      { to: PATHS.audit, label: 'Auditoría', icon: AuditIcon },
    ],
  },
];
