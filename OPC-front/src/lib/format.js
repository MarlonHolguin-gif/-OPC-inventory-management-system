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
