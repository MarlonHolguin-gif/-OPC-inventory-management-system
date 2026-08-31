import { Navigate, Outlet } from 'react-router-dom';
import { AuthStore } from '@/stores/AuthStore';
import { PATHS } from '@/app/routes';

/**
 * Sin `roles`: solo exige sesión activa (redirige a /login si no hay).
 * Con `roles`: además exige que el rol del usuario esté en la lista
 * (redirige a /dashboard si no cumple — está autenticado, solo no autorizado).
 */
export default function ProtectedRoute({ roles }) {
  if (!AuthStore.isAuthenticated.value) {
    return <Navigate to={PATHS.login} replace />;
  }

  if (roles && !roles.includes(AuthStore.role.value)) {
    return <Navigate to={PATHS.dashboard} replace />;
  }

  return <Outlet />;
}
