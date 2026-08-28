import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthProvider';
import ProtectedRoute from './routes/ProtectedRoute';
import AppLayout from './layout/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import InventoryPage from './pages/InventoryPage';
import MovementFormPage from './pages/MovementFormPage';
import PurchaseOrdersPage from './pages/PurchaseOrdersPage';
import PurchaseOrderFormPage from './pages/PurchaseOrderFormPage';
import PurchaseOrderDetailPage from './pages/PurchaseOrderDetailPage';
import TransfersPage from './pages/TransfersPage';
import TransferFormPage from './pages/TransferFormPage';
import TransferDetailPage from './pages/TransferDetailPage';
import UsersPage from './pages/UsersPage';
import BranchesPage from './pages/BranchesPage';
import SuppliersPage from './pages/SuppliersPage';
import AuditPage from './pages/AuditPage';
import SaleFormPage from './pages/SaleFormPage';
import PriceListsPage from './pages/PriceListsPage';
import CatalogPage from './pages/CatalogPage';
import CustomersPage from './pages/CustomersPage';
import SalesHistoryPage from './pages/SalesHistoryPage';

const GENERAL_ADMIN_ROLE = 'GENERAL_ADMIN';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/inventario" element={<InventoryPage />} />
              <Route path="/movimientos" element={<MovementFormPage />} />
              <Route path="/compras" element={<PurchaseOrdersPage />} />
              <Route path="/compras/nueva" element={<PurchaseOrderFormPage />} />
              <Route path="/compras/:orderId" element={<PurchaseOrderDetailPage />} />
              <Route path="/ventas/nueva" element={<SaleFormPage />} />
              <Route path="/transferencias" element={<TransfersPage />} />
              <Route path="/transferencias/nueva" element={<TransferFormPage />} />
              <Route path="/transferencias/:transferId" element={<TransferDetailPage />} />

              <Route element={<ProtectedRoute roles={[GENERAL_ADMIN_ROLE]} />}>
                <Route path="/usuarios" element={<UsersPage />} />
                <Route path="/sucursales" element={<BranchesPage />} />
                <Route path="/proveedores" element={<SuppliersPage />} />
                <Route path="/listas-precios" element={<PriceListsPage />} />
                <Route path="/catalogo" element={<CatalogPage />} />
                <Route path="/clientes" element={<CustomersPage />} />
                <Route path="/ventas/historico" element={<SalesHistoryPage />} />
                <Route path="/auditoria" element={<AuditPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
