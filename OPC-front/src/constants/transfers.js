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

export function transferStatusLabel(status) {
  return TRANSFER_STATUS_LABELS[status] ?? status;
}

export function urgencyLabel(urgency) {
  return TRANSFER_URGENCY_LABELS[urgency] ?? urgency;
}

export function routePriorityLabel(routePriority) {
  return ROUTE_PRIORITY_LABELS[routePriority] ?? routePriority;
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
