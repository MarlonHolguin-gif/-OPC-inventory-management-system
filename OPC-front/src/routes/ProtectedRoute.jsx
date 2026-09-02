import { Navigate, Outlet } from 'react-router-dom';
import { AuthStore } from '@/stores/AuthStore';
import { PATHS, homePathFor } from '@/app/routes';

/**
 * Sin `roles`: solo exige sesión activa (redirige a /login si no hay).
 * Con `roles`: además exige que el rol del usuario esté en la lista. Si no
 * cumple (está autenticado, solo no autorizado) redirige a `fallback`, o a
 * la pantalla de inicio de su rol — nunca a una ruta que tampoco puede ver.
 */
export default function ProtectedRoute({ roles, fallback }) {
  if (!AuthStore.isAuthenticated.value) {
    return <Navigate to={PATHS.login} replace />;
  }

  const role = AuthStore.role.value;
  if (roles && !roles.includes(role)) {
    return <Navigate to={fallback ?? homePathFor(role)} replace />;
  }

  return <Outlet />;
}
