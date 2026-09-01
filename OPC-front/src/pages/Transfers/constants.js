// Etiquetas y helpers de UI para Transferencias — reflejan literalmente los
// ENUM de la BD (opcback.transfers.entity.TransferStatus/TransferUrgency).

export const TRANSFER_STATUS_LABELS = {
  REQUESTED: 'Solicitada',
  IN_PREPARATION: 'En preparación',
  IN_TRANSIT: 'En tránsito',
  FULLY_RECEIVED: 'Recibida completa',
  PARTIALLY_RECEIVED: 'Recibida parcial',
  CANCELLED: 'Cancelada',
};

export const TRANSFER_URGENCY_LABELS = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
};

// Prioridad de ruta (TransferRoutePriority) — concepto distinto de la
// urgencia de arriba: la fija la sucursal origen vía PATCH
// /transfers/{id}/route-priority, solo tiene 3 valores (sin CRITICAL) y se
// usa para clasificar rutas, no para la solicitud en sí.
export const ROUTE_PRIORITY_LABELS = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
};

// Opciones para el selector de prioridad de ruta (en el orden natural
// Alta → Media → Baja, no el alfabético del objeto de arriba).
export const ROUTE_PRIORITY_OPTIONS = [
  { value: 'HIGH', label: 'Alta' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'LOW', label: 'Baja' },
];

// Filtro del listado: agrega la opción "todas" al principio.
export const ROUTE_PRIORITY_FILTER_OPTIONS = [
  { value: '', label: 'Todas las prioridades' },
  ...ROUTE_PRIORITY_OPTIONS,
];

// Tratamiento del faltante de una recepción parcial (ShortageResolution).
export const SHORTAGE_RESOLUTION_LABELS = {
  RESHIPMENT: 'Reenvío',
  ADJUSTMENT: 'Ajuste',
  CLAIM: 'Reclamación',
};

export function shortageResolutionLabel(resolution) {
  return SHORTAGE_RESOLUTION_LABELS[resolution] ?? resolution;
}

export function transferStatusLabel(status) {
  return TRANSFER_STATUS_LABELS[status] ?? status;
}

export function urgencyLabel(urgency) {
  return TRANSFER_URGENCY_LABELS[urgency] ?? urgency;
}

export function routePriorityLabel(routePriority) {
  return ROUTE_PRIORITY_LABELS[routePriority] ?? routePriority;
}

export function routePriorityBadgeClass(routePriority) {
  if (routePriority === 'HIGH') return 'badge badge-warn';
  if (routePriority === 'LOW') return 'badge';
  return 'badge';
}

// Desviación entre una fecha estimada y la real, en días redondeados.
// Devuelve un texto legible ("A tiempo", "2 días de atraso", …) o '—'
// cuando falta alguno de los dos datos.
export function deliveryDeviationLabel(estimated, actual) {
  if (!estimated || !actual) return '—';
  const days = Math.round((new Date(actual) - new Date(estimated)) / 86400000);
  if (days > 0) return `${days} ${days === 1 ? 'día' : 'días'} de atraso`;
  if (days < 0) return `${-days} ${days === -1 ? 'día' : 'días'} de adelanto`;
  return 'A tiempo';
}

export function statusBadgeClass(status) {
  if (status === 'FULLY_RECEIVED') return 'badge badge-ok';
  if (status === 'CANCELLED') return 'badge badge-bad';
  if (status === 'PARTIALLY_RECEIVED') return 'badge badge-warn';
  return 'badge badge-warn';
}

export function urgencyBadgeClass(urgency) {
  if (urgency === 'CRITICAL') return 'badge badge-bad';
  if (urgency === 'HIGH') return 'badge badge-warn';
  return 'badge';
}

// Pasos de la línea de tiempo principal. CANCELLED se maneja aparte (corta
// el flujo desde cualquier punto, así que no tiene una posición fija).
export const TRANSFER_TIMELINE_STEPS = [
  { key: 'REQUESTED', label: () => 'Solicitada', matches: ['REQUESTED'] },
  { key: 'IN_PREPARATION', label: () => 'En preparación', matches: ['IN_PREPARATION'] },
  { key: 'IN_TRANSIT', label: () => 'En tránsito', matches: ['IN_TRANSIT'] },
  {
    key: 'RECEIVED',
    label: (status) => (status === 'PARTIALLY_RECEIVED' ? 'Recibida parcial' : 'Recibida completa'),
    matches: ['FULLY_RECEIVED', 'PARTIALLY_RECEIVED'],
  },
];

export function timelineStepIndex(status) {
  switch (status) {
    case 'REQUESTED':
      return 0;
    case 'IN_PREPARATION':
      return 1;
    case 'IN_TRANSIT':
      return 2;
    case 'FULLY_RECEIVED':
    case 'PARTIALLY_RECEIVED':
      return 3;
    default:
      return -1;
  }
}
