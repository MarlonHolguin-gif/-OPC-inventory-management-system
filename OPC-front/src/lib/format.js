// Helpers puros compartidos, hoy duplicados en varias páginas.

// Convierte un valor de input (string) a número; 0 si no es finito.
export function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

// ¿La lista de precios está vigente hoy? (activa y dentro del rango de fechas)
export function isCurrentlyValid(priceList) {
  if (!priceList.active) return false;
  const today = new Date().toISOString().slice(0, 10);
  if (priceList.startDate && today < priceList.startDate) return false;
  if (priceList.endDate && today > priceList.endDate) return false;
  return true;
}

// Mensaje de error del backend con fallback.
export function backendError(error, fallback) {
  return error?.response?.data?.message ?? fallback;
}

// Formatea un valor monetario con dos decimales y separador de miles.
// Devuelve un guion largo cuando no hay dato numérico.
export function formatCurrency(value) {
  if (value === null || value === undefined || value === '') return '—';
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '—';
  return parsed.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Formato colombiano fijo para fechas — no depende del locale del navegador
// (que en un equipo en inglés daría "8/31/2026, 2:02:19 PM").
const DATE_LOCALE = 'es-CO';

// Formatea una fecha y hora ISO como dd/mm/aaaa, hh:mm.
// Devuelve un guion largo cuando no hay dato o la fecha es inválida.
export function formatDateTime(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString(DATE_LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Formatea solo la fecha (sin hora) como dd/mm/aaaa.
export function formatDate(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString(DATE_LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// Formatea un porcentaje (el valor ya viene en base 100: 10 -> "10 %").
// Devuelve un guion largo cuando no hay dato numérico.
export function formatPercentage(value) {
  if (value === null || value === undefined || value === '') return '—';
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '—';
  const rounded = Math.round(parsed * 100) / 100;
  return `${rounded} %`;
}
