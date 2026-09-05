import { PATHS } from '@/app/routes';

// Etiquetas y helpers de UI para Notificaciones — reflejan literalmente el
// ENUM de la BD (opcback.system.alerts.entity.NotificationType).

export const NOTIFICATION_TYPE_LABELS = {
  LOW_STOCK: 'Stock bajo',
  HIGH_STOCK: 'Stock alto',
  TRANSFER_SHORTAGE: 'Faltante de transferencia',
  OUT_OF_STOCK: 'Sin existencias',
  TRANSFER_PENDING: 'Transferencia en curso',
  PURCHASE_ORDER_PENDING: 'Orden de compra en curso',
};

// Notificaciones de flujo de trabajo: no son un problema de stock sino un
// paso pendiente. Solo las recibe el gerente de la sucursal y el
// administrador general (el backend filtra por rol).
const WORKFLOW_TYPES = new Set(['TRANSFER_PENDING', 'PURCHASE_ORDER_PENDING']);

// Filtros del panel: 'Todas' + una opción por tipo, en el orden en que se
// muestran.
export const NOTIFICATION_TYPE_FILTERS = [
  { value: '', label: 'Todas' },
  { value: 'OUT_OF_STOCK', label: 'Sin existencias' },
  { value: 'LOW_STOCK', label: 'Stock bajo' },
  { value: 'HIGH_STOCK', label: 'Stock alto' },
  { value: 'TRANSFER_SHORTAGE', label: 'Faltantes' },
  { value: 'TRANSFER_PENDING', label: 'Transferencias' },
  { value: 'PURCHASE_ORDER_PENDING', label: 'Compras' },
];

export function notificationTypeLabel(type) {
  return NOTIFICATION_TYPE_LABELS[type] ?? type;
}

export function notificationTypeBadgeClass(type) {
  // TRANSFER_SHORTAGE es una pérdida confirmada y OUT_OF_STOCK es "no hay
  // nada que vender": más grave que un cruce de umbral, que es una alerta a
  // tiempo, no un hecho consumado. Las de flujo no son una alerta, son un
  // recordatorio de un paso pendiente.
  if (type === 'TRANSFER_SHORTAGE' || type === 'OUT_OF_STOCK') return 'badge badge-bad';
  if (WORKFLOW_TYPES.has(type)) return 'badge badge-info';
  return 'badge badge-warn';
}

/**
 * A dónde lleva el clic en una notificación: a la vista donde se atiende.
 * Stock → Inventario de esa sucursal con el producto ya filtrado por SKU.
 * Faltante / transferencia en curso → detalle de esa transferencia.
 * Orden de compra en curso → detalle de esa orden.
 * Devuelve null si no hay un destino claro.
 */
export function notificationLink(notification) {
  switch (notification.type) {
    case 'LOW_STOCK':
    case 'HIGH_STOCK':
    case 'OUT_OF_STOCK': {
      const params = new URLSearchParams({ sucursal: String(notification.branchId) });
      if (notification.productSku) params.set('buscar', notification.productSku);
      return `${PATHS.inventory}?${params.toString()}`;
    }
    case 'TRANSFER_SHORTAGE':
    case 'TRANSFER_PENDING':
      return notification.referenceId
        ? PATHS.transferDetail.replace(':transferId', notification.referenceId)
        : PATHS.transfers;
    case 'PURCHASE_ORDER_PENDING':
      return notification.referenceId
        ? PATHS.purchaseDetail.replace(':orderId', notification.referenceId)
        : PATHS.purchases;
    default:
      return null;
  }
}
