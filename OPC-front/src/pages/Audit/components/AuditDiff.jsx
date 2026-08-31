/**
 * Muestra de forma legible el cambio entre `oldValues` (valores_anteriores) y
 * `newValues` (valores_nuevos) de un evento de auditoría.
 *
 *  - CREATE: solo hay valores nuevos (todos los campos "aparecen").
 *  - DELETE: solo hay valores anteriores (todos "desaparecen").
 *  - UPDATE: el backend ya envía únicamente los campos que cambiaron.
 *  - LOGIN: `newValues` es `{ email, result }`.
 *
 * Los valores que son objeto/array (ej. una asociación reducida a id, o un
 * mapa) se muestran como JSON con sangría.
 */
function formatValue(value) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') {
    return <pre className="audit-diff-json">{JSON.stringify(value, null, 2)}</pre>;
  }
  if (typeof value === 'boolean') return value ? 'sí' : 'no';
  return String(value);
}

function serialize(value) {
  return value === undefined ? undefined : JSON.stringify(value);
}

export function AuditDiff({ action, oldValues, newValues }) {
  const before = oldValues ?? {};
  const after = newValues ?? {};

  if (action === 'LOGIN') {
    const entries = Object.entries(after);
    return (
      <table className="audit-diff">
        <tbody>
          {entries.map(([key, value]) => (
            <tr key={key}>
              <th scope="row">{key}</th>
              <td colSpan={2}>{formatValue(value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();

  if (keys.length === 0) {
    return <p className="audit-diff-empty">Este evento no registró valores.</p>;
  }

  return (
    <table className="audit-diff">
      <thead>
        <tr>
          <th>Campo</th>
          <th>Antes</th>
          <th>Después</th>
        </tr>
      </thead>
      <tbody>
        {keys.map((key) => {
          const changed = serialize(before[key]) !== serialize(after[key]);
          return (
            <tr key={key} className={changed ? 'audit-diff-changed' : undefined}>
              <th scope="row">{key}</th>
              <td className="audit-diff-old">{formatValue(before[key])}</td>
              <td className="audit-diff-new">{formatValue(after[key])}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
