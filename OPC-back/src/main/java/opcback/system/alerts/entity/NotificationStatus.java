package opcback.system.alerts.entity;

/**
 * Valores idénticos al ENUM de sy_notifications.status. Toda notificación
 * nace en PENDING; PATCH /api/notificaciones/{id}/leida la mueve a READ.
 * SENT queda reservado para cuando exista un canal real de envío (EMAIL).
 */
public enum NotificationStatus {
    PENDING,
    SENT,
    READ
}
