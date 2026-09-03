// Etiquetas y helpers de UI para Notificaciones — reflejan literalmente el
// ENUM de la BD (opcback.system.alerts.entity.NotificationType).

export const NOTIFICATION_TYPE_LABELS = {
  LOW_STOCK: 'Stock bajo',
  HIGH_STOCK: 'Stock alto',
  TRANSFER_SHORTAGE: 'Faltante de transferencia',
  OUT_OF_STOCK: 'Sin existencias',
};

// Filtros del panel: 'Todas' + una opción por tipo, en el orden en que se
// muestran.
export const NOTIFICATION_TYPE_FILTERS = [
  { value: '', label: 'Todas' },
  { value: 'OUT_OF_STOCK', label: 'Sin existencias' },
  { value: 'LOW_STOCK', label: 'Stock bajo' },
  { value: 'HIGH_STOCK', label: 'Stock alto' },
  { value: 'TRANSFER_SHORTAGE', label: 'Faltantes' },
];

export function notificationTypeLabel(type) {
  return NOTIFICATION_TYPE_LABELS[type] ?? type;
}

export function notificationTypeBadgeClass(type) {
  // TRANSFER_SHORTAGE es una pérdida confirmada y OUT_OF_STOCK es "no hay
  // nada que vender": más grave que un cruce de umbral, que es una alerta a
  // tiempo, no un hecho consumado.
  return type === 'TRANSFER_SHORTAGE' || type === 'OUT_OF_STOCK'
    ? 'badge badge-bad'
    : 'badge badge-warn';
}
