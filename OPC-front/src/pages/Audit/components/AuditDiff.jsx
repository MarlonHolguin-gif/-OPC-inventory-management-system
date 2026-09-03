import { auditFieldLabel } from '../constants';

/**
 * Muestra de forma legible el cambio entre `oldValues` (valores_anteriores) y
 * `newValues` (valores_nuevos) de un evento de auditoría.
 *
 *  - CREATE: solo hay valores nuevos (todos los campos "aparecen").
 *  - DELETE: solo hay valores anteriores (todos "desaparecen").
 *  - UPDATE: el backend ya envía únicamente los campos que cambiaron.
 *
 * El nombre de cada campo y las asociaciones (categoría, unidad base) vienen
 * ya en texto legible; los valores que siguen siendo objeto/array se muestran
 * como JSON con sangría.
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

export function AuditDiff({ oldValues, newValues }) {
  const before = oldValues ?? {};
  const after = newValues ?? {};

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
              <th scope="row">{auditFieldLabel(key)}</th>
              <td className="audit-diff-old">{formatValue(before[key])}</td>
              <td className="audit-diff-new">{formatValue(after[key])}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
