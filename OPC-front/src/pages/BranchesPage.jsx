import { useEffect, useState } from 'react';
import httpClient from '../api/httpClient';

const EMPTY_FORM = { code: '', name: '', address: '', city: '', phone: '' };

export default function BranchesPage() {
  const [branches, setBranches] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadBranches = () => {
    httpClient
      .get('/api/branches')
      .then(({ data }) => setBranches(data))
      .catch(() => setError('No se pudo cargar la lista de sucursales.'))
      .finally(() => setLoading(false));
  };

  useEffect(loadBranches, []);

  const startEdit = (branch) => {
    setEditingId(branch.id);
    setForm({
      code: branch.code,
      name: branch.name,
      address: branch.address ?? '',
      city: branch.city ?? '',
      phone: branch.phone ?? '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    const payload = {
      name: form.name,
      address: form.address || null,
      city: form.city || null,
      phone: form.phone || null,
    };

    try {
      if (editingId) {
        await httpClient.put(`/api/branches/${editingId}`, payload);
      } else {
        await httpClient.post('/api/branches', { ...payload, code: form.code });
      }
      cancelEdit();
      loadBranches();
    } catch (submitError) {
      setError(submitError.response?.data?.message ?? 'No se pudo guardar la sucursal.');
    }
  };

  const handleDeactivate = async (id) => {
    setError(null);
    try {
      await httpClient.patch(`/api/branches/${id}/deactivate`);
      loadBranches();
    } catch {
      setError('No se pudo desactivar la sucursal.');
    }
  };

  if (loading) return <main>Cargando…</main>;

  return (
    <main>
      <h1>Sucursales</h1>
      {error && <p role="alert">{error}</p>}

      <form onSubmit={handleSubmit} noValidate>
        <h2>{editingId ? 'Editar sucursal' : 'Nueva sucursal'}</h2>

        <label htmlFor="code">Código</label>
        <input
          id="code"
          value={form.code}
          onChange={(event) => setForm({ ...form, code: event.target.value })}
          disabled={Boolean(editingId)}
          required
        />

        <label htmlFor="name">Nombre</label>
        <input id="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />

        <label htmlFor="address">Dirección</label>
        <input id="address" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />

        <label htmlFor="city">Ciudad</label>
        <input id="city" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />

        <label htmlFor="phone">Teléfono</label>
        <input id="phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />

        <button type="submit">{editingId ? 'Guardar cambios' : 'Crear sucursal'}</button>
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
            <th>Código</th>
            <th>Nombre</th>
            <th>Ciudad</th>
            <th>Teléfono</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {branches.map((branch) => (
            <tr key={branch.id}>
              <td>{branch.code}</td>
              <td>{branch.name}</td>
              <td>{branch.city ?? '—'}</td>
              <td>{branch.phone ?? '—'}</td>
              <td>{branch.active ? 'Activa' : 'Inactiva'}</td>
              <td>
                <button type="button" onClick={() => startEdit(branch)}>
                  Editar
                </button>
                {branch.active && (
                  <button type="button" onClick={() => handleDeactivate(branch.id)}>
                    Desactivar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
