// Tema y helpers de las gráficas del panel.
//
// Paleta categórica validada contra daltonismo/contraste (mismo trío que el
// reporte de cumplimiento logístico, ver --chart-low/medium/high en
// index.css) — se reutiliza aquí como "serie 1/2/3" genérica. Asignación
// fija por orden de aparición, nunca reordenada según los datos.

export const SERIES_1 = 'var(--chart-low)'; // azul
export const SERIES_2 = 'var(--chart-high)'; // naranja
export const SERIES_3 = 'var(--chart-medium)'; // aqua
export const MUTED = 'var(--border)';
export const TEXT_DIM = 'var(--text-dim)';
export const GRID = 'var(--border)';

export const axisTickStyle = { fill: TEXT_DIM, fontSize: 12 };

export function formatNumber(value) {
  return Number(value).toLocaleString('es-CO', { maximumFractionDigits: 0 });
}

export function monthLabel(month) {
  const [year, monthIndex] = month.split('-').map(Number);
  return new Date(year, monthIndex - 1, 1).toLocaleDateString('es-CO', {
    month: 'short',
    year: '2-digit',
  });
}

export function horizontalBarHeight(count) {
  return Math.max(160, count * 38 + 40);
}

// Etiquetas de los estados "activos" de una transferencia (los que puede
// devolver el desglose de "Transferencias activas y su impacto" — nunca
// FULLY_RECEIVED ni CANCELLED, que el backend excluye).
const ACTIVE_TRANSFER_STATUS_LABELS = {
  REQUESTED: 'Solicitada',
  IN_PREPARATION: 'En preparación',
  IN_TRANSIT: 'En tránsito',
  PARTIALLY_RECEIVED: 'Recibida parcial',
};

export function transferStatusLabel(status) {
  return ACTIVE_TRANSFER_STATUS_LABELS[status] ?? status;
}
