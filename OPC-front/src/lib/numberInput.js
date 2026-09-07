/**
 * Todo el sistema trabaja con enteros no negativos: cantidades, porcentajes,
 * umbrales, stock y precios. Estos helpers impiden escribir el punto decimal
 * en un <input type="number"> y sanean lo que se pegue.
 */

const BLOCKED_KEYS = new Set(['.', ',', 'e', 'E', '+', '-']);

export function blockNonIntegerKey(event) {
  if (BLOCKED_KEYS.has(event.key)) {
    event.preventDefault();
  }
}

// "12.5" -> "12", "1,5" -> "1", "abc12" -> "12", "" -> ""
export function toIntegerString(value) {
  return String(value ?? '')
    .split(/[.,]/)[0]
    .replace(/\D/g, '');
}
