import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * Sin `roles`: solo exige sesión activa (redirige a /login si no hay).
 * Con `roles`: además exige que el rol del usuario esté en la lista
 * (redirige a /dashboard si no cumple — está autenticado, solo no autorizado).
 */
export default function ProtectedRoute({ roles }) {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
