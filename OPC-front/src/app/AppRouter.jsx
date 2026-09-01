import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '@/routes/ProtectedRoute';
import AppLayout from '@/layout/AppLayout';
import { ADMIN_ROLES, PATHS } from '@/app/routes';
import LoginPage from '@/pages/Login/LoginPage';
import DashboardPage from '@/pages/Dashboard/DashboardPage';
import InventoryPage from '@/pages/Inventory/InventoryPage';
import MovementsPage from '@/pages/Movements/MovementsPage';
import PurchasesPage from '@/pages/Purchases/PurchasesPage';
import PurchaseOrderDetailPage from '@/pages/Purchases/PurchaseOrderDetailPage';
import TransfersPage from '@/pages/Transfers/TransfersPage';
import TransferDetailPage from '@/pages/Transfers/TransferDetailPage';
import ComplianceReportPage from '@/pages/Transfers/ComplianceReportPage';
import UsersPage from '@/pages/Users/UsersPage';
import BranchesPage from '@/pages/Branches/BranchesPage';
import SuppliersPage from '@/pages/Suppliers/SuppliersPage';
import AuditPage from '@/pages/Audit/AuditPage';
import SalesPage from '@/pages/Sales/SalesPage';
import SaleDetailPage from '@/pages/Sales/SaleDetailPage';
import PriceListsPage from '@/pages/PriceLists/PriceListsPage';
import CatalogPage from '@/pages/Catalog/CatalogPage';
import CustomersPage from '@/pages/Customers/CustomersPage';

export default function AppRouter() {
  return (
    <Routes>
      <Route path={PATHS.login} element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path={PATHS.dashboard} element={<DashboardPage />} />
          <Route path={PATHS.inventory} element={<InventoryPage />} />
          <Route path={PATHS.movements} element={<MovementsPage />} />
          <Route path={PATHS.purchases} element={<PurchasesPage />} />
          <Route path={PATHS.purchaseDetail} element={<PurchaseOrderDetailPage />} />
          <Route path={PATHS.sales} element={<SalesPage />} />
          <Route path={PATHS.saleDetail} element={<SaleDetailPage />} />
          <Route path={PATHS.transfers} element={<TransfersPage />} />
          <Route path={PATHS.transferDetail} element={<TransferDetailPage />} />

          <Route element={<ProtectedRoute roles={ADMIN_ROLES} />}>
            <Route path={PATHS.users} element={<UsersPage />} />
            <Route path={PATHS.branches} element={<BranchesPage />} />
            <Route path={PATHS.suppliers} element={<SuppliersPage />} />
            <Route path={PATHS.priceLists} element={<PriceListsPage />} />
            <Route path={PATHS.catalog} element={<CatalogPage />} />
            <Route path={PATHS.customers} element={<CustomersPage />} />
            <Route path={PATHS.logisticsCompliance} element={<ComplianceReportPage />} />
            <Route path={PATHS.audit} element={<AuditPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="/" element={<Navigate to={PATHS.dashboard} replace />} />
      <Route path="*" element={<Navigate to={PATHS.dashboard} replace />} />
    </Routes>
  );
}
