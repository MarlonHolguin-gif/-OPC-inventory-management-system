// Estados de una venta (opcback.sales ENUM SaleStatus).
// Etiquetas legibles para mostrar en pantalla en lugar del valor crudo.
export const SALE_STATUS_LABELS = {
  CONFIRMED: 'Confirmada',
  VOIDED: 'Anulada',
};

export function saleStatusLabel(status) {
  return SALE_STATUS_LABELS[status] ?? status ?? '—';
}
