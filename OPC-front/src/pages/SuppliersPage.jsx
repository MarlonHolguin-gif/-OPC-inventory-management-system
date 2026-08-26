import { useEffect, useMemo, useState } from 'react';
import httpClient from '../api/httpClient';

const EMPTY_FORM = { name: '', taxId: '', contact: '', phone: '', email: '', address: '' };

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadSuppliers = () => {
    httpClient
      .get('/api/suppliers')
      .then(({ data }) => setSuppliers(data))
      .catch(() => setError('No se pudo cargar la lista de proveedores.'))
      .finally(() => setLoading(false));
  };

  useEffect(loadSuppliers, []);

  const filteredSuppliers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return suppliers;
    return suppliers.filter((supplier) => supplier.name.toLowerCase().includes(term));
  }, [suppliers, search]);

  const startEdit = (supplier) => {
    setEditingId(supplier.id);
    setForm({
      name: supplier.name,
      taxId: supplier.taxId ?? '',
      contact: supplier.contact ?? '',
      phone: supplier.phone ?? '',
      email: supplier.email ?? '',
      address: supplier.address ?? '',
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
      ...form,
      taxId: form.taxId.trim() || null,
    };

    try {
      if (editingId) {
        await httpClient.put(`/api/suppliers/${editingId}`, payload);
      } else {
        await httpClient.post('/api/suppliers', payload);
      }
      cancelEdit();
      loadSuppliers();
    } catch (submitError) {
      setError(submitError.response?.data?.message ?? 'No se pudo guardar el proveedor.');
    }
  };

  const handleDeactivate = async (id) => {
    try {
      await httpClient.patch(`/api/suppliers/${id}/deactivate`);
      loadSuppliers();
    } catch {
      setError('No se pudo desactivar el proveedor.');
    }
  };

  const handleReactivate = async (id) => {
    try {
      await httpClient.patch(`/api/suppliers/${id}/reactivate`);
      loadSuppliers();
    } catch {
      setError('No se pudo reactivar el proveedor.');
    }
  };

  if (loading) return <main>Cargando…</main>;

  return (
    <main>
      <h1>Proveedores</h1>

      <form onSubmit={handleSubmit} noValidate>
        <h2>{editingId ? 'Editar proveedor' : 'Nuevo proveedor'}</h2>

        <label htmlFor="name">Nombre</label>
        <input
          id="name"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          required
        />

        <label htmlFor="taxId">NIT / tax_id</label>
        <input id="taxId" value={form.taxId} onChange={(event) => setForm({ ...form, taxId: event.target.value })} />

        <label htmlFor="contact">Contacto</label>
        <input id="contact" value={form.contact} onChange={(event) => setForm({ ...form, contact: event.target.value })} />

        <label htmlFor="phone">Teléfono</label>
        <input id="phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />

        <label htmlFor="email">Correo</label>
        <input id="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />

        <label htmlFor="address">Dirección</label>
        <input id="address" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />

        {error && <p role="alert">{error}</p>}

        <button type="submit">{editingId ? 'Guardar cambios' : 'Crear proveedor'}</button>
        {editingId && (
          <button type="button" onClick={cancelEdit}>
            Cancelar
          </button>
        )}
      </form>

      <hr />

      <input
        type="search"
        placeholder="Buscar por nombre…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        aria-label="Buscar proveedor"
      />

      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>tax_id</th>
            <th>Contacto</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filteredSuppliers.map((supplier) => (
            <tr key={supplier.id}>
              <td>{supplier.name}</td>
              <td>{supplier.taxId ?? '—'}</td>
              <td>{supplier.contact ?? '—'}</td>
              <td>{supplier.active ? 'Activo' : 'Inactivo'}</td>
              <td>
                <button type="button" onClick={() => startEdit(supplier)}>
                  Editar
                </button>
                {supplier.active ? (
                  <button type="button" onClick={() => handleDeactivate(supplier.id)}>
                    Desactivar
                  </button>
                ) : (
                  <button type="button" onClick={() => handleReactivate(supplier.id)}>
                    Reactivar
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
