// Etiquetas y helpers de UI para Notificaciones — reflejan literalmente el
// ENUM de la BD (opcback.system.alerts.entity.NotificationType).

export const NOTIFICATION_TYPE_LABELS = {
  LOW_STOCK: 'Stock bajo',
  HIGH_STOCK: 'Stock alto',
  TRANSFER_SHORTAGE: 'Faltante de transferencia',
};

export function notificationTypeLabel(type) {
  return NOTIFICATION_TYPE_LABELS[type] ?? type;
}

export function notificationTypeBadgeClass(type) {
  // TRANSFER_SHORTAGE ya es una pérdida confirmada (más grave); los cruces
  // de stock son una alerta a tiempo, no un hecho consumado.
  return type === 'TRANSFER_SHORTAGE' ? 'badge badge-bad' : 'badge badge-warn';
}
