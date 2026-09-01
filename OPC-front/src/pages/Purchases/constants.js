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

// Pestañas del módulo de compras.
export const PURCHASES_TABS = [
  { id: 'orders', label: 'Órdenes de compra' },
  { id: 'history', label: 'Histórico por proveedor y producto' },
];

// Agrupación del listado de órdenes, en el orden en que se muestra:
// primero las ya recibidas, luego las pendientes por recibir, luego las
// pendientes por enviar al proveedor y por último las canceladas.
export const PURCHASE_ORDER_GROUPS = [
  {
    id: 'received',
    title: 'Recibidas',
    statuses: ['FULLY_RECEIVED'],
    empty: 'Todavía no hay órdenes recibidas por completo.',
  },
  {
    id: 'pendingReceipt',
    title: 'Pendientes por hacer recepción de mercancía',
    statuses: ['SENT', 'PARTIALLY_RECEIVED'],
    empty: 'No hay órdenes esperando recepción.',
  },
  {
    id: 'pendingSend',
    title: 'Pendientes por enviar al proveedor',
    statuses: ['DRAFT'],
    empty: 'No hay órdenes en borrador.',
  },
  {
    id: 'cancelled',
    title: 'Canceladas',
    statuses: ['CANCELLED'],
    empty: 'No hay órdenes canceladas.',
  },
];
