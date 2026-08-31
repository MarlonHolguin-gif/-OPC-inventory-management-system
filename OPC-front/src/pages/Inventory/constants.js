export const ALERT_LABELS = {
  LOW_STOCK: 'Stock bajo',
  HIGH_STOCK: 'Stock alto',
  NORMAL: 'Normal',
};

export function alertLabel(status) {
  return ALERT_LABELS[status] ?? status;
}
