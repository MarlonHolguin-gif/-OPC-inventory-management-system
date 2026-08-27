import { useEffect, useMemo, useState } from 'react';
import httpClient from '../api/httpClient';

const EMPTY_FORM = { name: '', documentType: '', documentNumber: '', phone: '', email: '' };

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadCustomers = () => {
    httpClient
      .get('/api/customers')
      .then(({ data }) => setCustomers(data))
      .catch(() => setError('No se pudo cargar la lista de clientes.'))
      .finally(() => setLoading(false));
  };

  useEffect(loadCustomers, []);

  const filteredCustomers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter((customer) => customer.name.toLowerCase().includes(term));
  }, [customers, search]);

  const startEdit = (customer) => {
    setEditingId(customer.id);
    setForm({
      name: customer.name,
      documentType: customer.documentType ?? '',
      documentNumber: customer.documentNumber ?? '',
      phone: customer.phone ?? '',
      email: customer.email ?? '',
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
      documentType: form.documentType || null,
      documentNumber: form.documentNumber || null,
      phone: form.phone || null,
      email: form.email || null,
    };

    try {
      if (editingId) {
        await httpClient.put(`/api/customers/${editingId}`, payload);
      } else {
        await httpClient.post('/api/customers', payload);
      }
      cancelEdit();
      loadCustomers();
    } catch (submitError) {
      setError(submitError.response?.data?.message ?? 'No se pudo guardar el cliente.');
    }
  };

  const handleDeactivate = async (id) => {
    setError(null);
    try {
      await httpClient.patch(`/api/customers/${id}/deactivate`);
      loadCustomers();
    } catch {
      setError('No se pudo desactivar el cliente.');
    }
  };

  const handleReactivate = async (id) => {
    setError(null);
    try {
      await httpClient.patch(`/api/customers/${id}/reactivate`);
      loadCustomers();
    } catch {
      setError('No se pudo reactivar el cliente.');
    }
  };

  if (loading) return <main>Cargando…</main>;

  return (
    <main>
      <h1>Clientes</h1>

      <form onSubmit={handleSubmit} noValidate>
        <h2>{editingId ? 'Editar cliente' : 'Nuevo cliente'}</h2>

        <label htmlFor="name">Nombre</label>
        <input
          id="name"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          required
        />

        <label htmlFor="documentType">Tipo de documento</label>
        <input
          id="documentType"
          value={form.documentType}
          onChange={(event) => setForm({ ...form, documentType: event.target.value })}
          placeholder="ej. CC, NIT"
        />

        <label htmlFor="documentNumber">Número de documento</label>
        <input
          id="documentNumber"
          value={form.documentNumber}
          onChange={(event) => setForm({ ...form, documentNumber: event.target.value })}
        />

        <label htmlFor="phone">Teléfono</label>
        <input id="phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />

        <label htmlFor="email">Correo</label>
        <input id="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />

        {error && <p role="alert">{error}</p>}

        <button type="submit">{editingId ? 'Guardar cambios' : 'Crear cliente'}</button>
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
        aria-label="Buscar cliente"
      />

      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Documento</th>
            <th>Teléfono</th>
            <th>Correo</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filteredCustomers.map((customer) => (
            <tr key={customer.id}>
              <td>{customer.name}</td>
              <td>
                {customer.documentType || customer.documentNumber
                  ? `${customer.documentType ?? ''} ${customer.documentNumber ?? ''}`.trim()
                  : '—'}
              </td>
              <td>{customer.phone ?? '—'}</td>
              <td>{customer.email ?? '—'}</td>
              <td>{customer.active ? 'Activo' : 'Inactivo'}</td>
              <td>
                <button type="button" onClick={() => startEdit(customer)}>
                  Editar
                </button>
                {customer.active ? (
                  <button type="button" onClick={() => handleDeactivate(customer.id)}>
                    Desactivar
                  </button>
                ) : (
                  <button type="button" onClick={() => handleReactivate(customer.id)}>
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
