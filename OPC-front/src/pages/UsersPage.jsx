import { useEffect, useState } from 'react';
import httpClient from '../api/httpClient';
import { ROLES, roleName } from '../constants/roles';
import { EyeIcon, EyeOffIcon } from '../components/icons/UtilityIcons';

const GENERAL_ADMIN_ROLE = 'GENERAL_ADMIN';
const EMPTY_FORM = { name: '', email: '', password: '', roleCode: ROLES[0].code, branchId: '' };

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [branchesByUser, setBranchesByUser] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  /**
   * UserResponse no trae las sucursales asignadas — hay que pedirlas aparte
   * por usuario (son pocos usuarios en este sistema, no vale la pena un
   * endpoint de listado en lote solo para esto).
   */
  const loadUsers = () => {
    return httpClient
      .get('/api/users')
      .then(({ data }) => {
        setUsers(data);
        return Promise.all(
          data.map((user) => httpClient.get(`/api/users/${user.id}/branches`).then(({ data: ids }) => [user.id, ids])),
        );
      })
      .then((entries) => setBranchesByUser(Object.fromEntries(entries)))
      .catch(() => setError('No se pudo cargar la lista de usuarios.'));
  };

  useEffect(() => {
    Promise.all([httpClient.get('/api/branches').then(({ data }) => setBranches(data)), loadUsers()])
      .catch(() => setError('No se pudo cargar la información de usuarios.'))
      .finally(() => setLoading(false));
  }, []);

  const branchNamesFor = (user) => {
    if (user.roleCode === GENERAL_ADMIN_ROLE) return 'Todas';
    const ids = branchesByUser[user.id] ?? [];
    if (ids.length === 0) return '—';
    return ids.map((id) => branches.find((branch) => branch.id === id)?.name ?? id).join(', ');
  };

  const startEdit = (user) => {
    setEditingId(user.id);
    setForm({ name: user.name, email: user.email, password: '', roleCode: user.roleCode });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowPassword(false);
  };

  const needsBranch = form.roleCode !== GENERAL_ADMIN_ROLE;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    if (!editingId && needsBranch && !form.branchId) {
      setError('Selecciona a qué sucursal va a servir este usuario.');
      return;
    }

    try {
      if (editingId) {
        await httpClient.put(`/api/users/${editingId}`, {
          name: form.name,
          email: form.email,
          roleCode: form.roleCode,
        });
      } else {
        await httpClient.post('/api/users', {
          name: form.name,
          email: form.email,
          password: form.password,
          roleCode: form.roleCode,
          branchIds: needsBranch ? [Number(form.branchId)] : [],
        });
      }
      cancelEdit();
      loadUsers();
    } catch (submitError) {
      setError(submitError.response?.data?.message ?? 'No se pudo guardar el usuario.');
    }
  };

  const handleDeactivate = async (id) => {
    setError(null);
    try {
      await httpClient.patch(`/api/users/${id}/deactivate`);
      loadUsers();
    } catch {
      setError('No se pudo desactivar el usuario.');
    }
  };

  const handleReactivate = async (id) => {
    setError(null);
    try {
      await httpClient.patch(`/api/users/${id}/reactivate`);
      loadUsers();
    } catch {
      setError('No se pudo reactivar el usuario.');
    }
  };

  const selectedUser = users.find((user) => user.id === selectedUserId) ?? null;

  if (loading) return <main>Cargando…</main>;

  return (
    <main>
      <h1>Usuarios</h1>
      {error && <p role="alert">{error}</p>}

      <form onSubmit={handleSubmit} noValidate>
        <h2>{editingId ? 'Editar usuario' : 'Nuevo usuario'}</h2>

        <label htmlFor="name">Nombre</label>
        <input id="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />

        <label htmlFor="email">Correo</label>
        <input
          id="email"
          type="email"
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
          required
        />

        {!editingId && (
          <>
            <label htmlFor="password">Contraseña</label>
            <div className="input-with-action">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                minLength={8}
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                required
              />
              <button
                type="button"
                className="input-action"
                onClick={() => setShowPassword((current) => !current)}
                aria-pressed={showPassword}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </>
        )}

        <label htmlFor="roleCode">Rol</label>
        <select
          id="roleCode"
          value={form.roleCode}
          onChange={(event) => setForm({ ...form, roleCode: event.target.value, branchId: '' })}
        >
          {ROLES.map((role) => (
            <option key={role.code} value={role.code}>
              {role.name}
            </option>
          ))}
        </select>

        {!editingId && needsBranch && (
          <>
            <label htmlFor="branchId">Sucursal a la que va a servir</label>
            <select id="branchId" value={form.branchId} onChange={(event) => setForm({ ...form, branchId: event.target.value })}>
              <option value="">— elegir —</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </>
        )}

        <button type="submit">{editingId ? 'Guardar cambios' : 'Crear usuario'}</button>
        {editingId && (
          <button type="button" onClick={cancelEdit}>
            Cancelar
          </button>
        )}
      </form>

      <hr />

      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Correo</th>
            <th>Rol</th>
            <th>Sucursales activas</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{roleName(user.roleCode)}</td>
              <td>{branchNamesFor(user)}</td>
              <td>{user.active ? 'Activo' : 'Inactivo'}</td>
              <td>
                <button type="button" onClick={() => startEdit(user)}>
                  Editar
                </button>
                <button type="button" onClick={() => setSelectedUserId(user.id)}>
                  Gestionar sucursales
                </button>
                {user.active ? (
                  <button type="button" onClick={() => handleDeactivate(user.id)}>
                    Desactivar
                  </button>
                ) : (
                  <button type="button" onClick={() => handleReactivate(user.id)}>
                    Reactivar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedUser && (
        <UserBranchesPanel
          user={selectedUser}
          branches={branches}
          onClose={() => setSelectedUserId(null)}
          onBranchesChanged={loadUsers}
          setError={setError}
        />
      )}
    </main>
  );
}

function UserBranchesPanel({ user, branches, onClose, onBranchesChanged, setError }) {
  const [assignedIds, setAssignedIds] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAssigned = () => {
    httpClient
      .get(`/api/users/${user.id}/branches`)
      .then(({ data }) => setAssignedIds(data))
      .catch(() => setError('No se pudo cargar las sucursales del usuario.'))
      .finally(() => setLoading(false));
  };

  useEffect(loadAssigned, [user.id, setError]);

  const toggleBranch = async (branchId, isAssigned) => {
    setError(null);
    try {
      if (isAssigned) {
        await httpClient.delete(`/api/users/${user.id}/branches/${branchId}`);
      } else {
        await httpClient.put(`/api/users/${user.id}/branches/${branchId}`);
      }
      loadAssigned();
      onBranchesChanged();
    } catch {
      setError('No se pudo actualizar la sucursal del usuario.');
    }
  };

  return (
    <div className="panel-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <h3 style={{ margin: 0 }}>Sucursales de "{user.name}"</h3>
        <button type="button" onClick={onClose}>
          Cerrar
        </button>
      </div>

      {loading ? (
        <p>Cargando…</p>
      ) : (
        <div className="branch-grid">
          {branches.map((branch) => {
            const isAssigned = assignedIds.includes(branch.id);
            return (
              <label key={branch.id} className={`branch-toggle${isAssigned ? ' checked' : ''}`}>
                <input type="checkbox" checked={isAssigned} onChange={() => toggleBranch(branch.id, isAssigned)} />
                {branch.name}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
