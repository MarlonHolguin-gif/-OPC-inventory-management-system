// Etiquetas de UI para la vista de auditoría — reflejan el ENUM
// sy_audit_log.action y los nombres de entidad que registra el backend
// (AuditEntityListener usa entityClass.getSimpleName()).

export const AUDIT_ACTION_LABELS = {
  CREATE: 'Alta',
  UPDATE: 'Modificación',
  DELETE: 'Baja',
};

export function auditActionLabel(action) {
  return AUDIT_ACTION_LABELS[action] ?? action;
}

export function auditActionBadgeClass(action) {
  if (action === 'DELETE') return 'badge badge-bad';
  if (action === 'CREATE') return 'badge badge-ok';
  return 'badge badge-warn';
}

// La auditoría cubre una sola entidad: el catálogo de productos (ver
// Auditable.java). Por eso ya no hay un mapa de entidades ni filtro por
// entidad — solo se filtra por id de producto, responsable y fechas.
