import { useAuth } from '../hooks/useAuth';

export default function DashboardPage() {
  const { logout } = useAuth();

  return (
    <main>
      <h1>Dashboard</h1>
      <p>Ruta privada — solo visible para usuarios autenticados.</p>
      <button type="button" onClick={logout}>
        Cerrar sesión
      </button>
    </main>
  );
}
