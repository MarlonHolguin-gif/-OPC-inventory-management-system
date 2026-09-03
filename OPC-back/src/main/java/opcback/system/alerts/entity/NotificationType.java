package opcback.system.alerts.entity;

/**
 * Valores idénticos al ENUM de sy_notifications.type en
 * V1__create_schema.sql — no cambiar sin cambiar también la migración.
 */
public enum NotificationType {
    LOW_STOCK,
    HIGH_STOCK,
    TRANSFER_SHORTAGE,
    OUT_OF_STOCK
}
