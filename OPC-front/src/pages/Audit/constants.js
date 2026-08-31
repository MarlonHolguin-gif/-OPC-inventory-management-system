// Etiquetas de UI para la vista de auditoría — reflejan el ENUM
// sy_audit_log.action y los nombres de entidad que registra el backend
// (AuditEntityListener usa entityClass.getSimpleName(); "Auth" es el string
// fijo de los eventos de login).

export const AUDIT_ACTION_LABELS = {
  CREATE: 'Alta',
  UPDATE: 'Modificación',
  DELETE: 'Baja',
  LOGIN: 'Inicio de sesión',
};

export function auditActionLabel(action) {
  return AUDIT_ACTION_LABELS[action] ?? action;
}

export function auditActionBadgeClass(action) {
  if (action === 'DELETE') return 'badge badge-bad';
  if (action === 'CREATE') return 'badge badge-ok';
  return 'badge badge-warn';
}

// Entidades que el backend audita (ver Auditable.java) + el evento de login.
export const AUDITED_ENTITIES = [
  { value: 'Auth', label: 'Autenticación' },
  { value: 'Product', label: 'Producto' },
  { value: 'PriceList', label: 'Lista de precios' },
  { value: 'User', label: 'Usuario' },
  { value: 'PurchaseOrder', label: 'Orden de compra' },
  { value: 'Transfer', label: 'Transferencia' },
];

export function auditEntityLabel(entity) {
  return AUDITED_ENTITIES.find((e) => e.value === entity)?.label ?? entity;
}
