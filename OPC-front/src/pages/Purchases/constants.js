// Estados de una orden de compra (opcback.purchases ENUM PurchaseOrderStatus).
// Etiquetas legibles para mostrar en pantalla en lugar del valor crudo.
export const PURCHASE_ORDER_STATUS_LABELS = {
  DRAFT: 'Borrador',
  SENT: 'Enviada al proveedor',
  PARTIALLY_RECEIVED: 'Recibida parcialmente',
  FULLY_RECEIVED: 'Recibida completa',
  CANCELLED: 'Cancelada',
};

export function purchaseOrderStatusLabel(status) {
  return PURCHASE_ORDER_STATUS_LABELS[status] ?? status ?? '—';
}

// Opciones de "Estado" para el filtro del histórico.
export const PURCHASE_ORDER_STATUS_OPTIONS = Object.entries(PURCHASE_ORDER_STATUS_LABELS).map(
  ([value, label]) => ({ value, label }),
);

// Pestañas del módulo de compras.
export const PURCHASES_TABS = [
  { id: 'orders', label: 'Órdenes de compra' },
  { id: 'history', label: 'Histórico' },
];

// Vistas del listado de órdenes: un filtro segmentado (solo las que requieren
// acción) encima de una sola tabla.
export const PURCHASE_ORDER_VIEWS = [
  { id: 'pendingSend', label: 'Por enviar al proveedor', statuses: ['DRAFT'] },
  { id: 'pendingReceipt', label: 'Por hacer recepción de mercancía', statuses: ['SENT', 'PARTIALLY_RECEIVED'] },
];
