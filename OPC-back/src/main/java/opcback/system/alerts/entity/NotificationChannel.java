package opcback.system.alerts.entity;

/**
 * Valores idénticos al ENUM de sy_notifications.channel. Hoy solo se usa
 * IN_APP — el envío real por EMAIL no está implementado, el valor existe
 * en el esquema para cuando se aborde.
 */
public enum NotificationChannel {
    IN_APP,
    EMAIL
}
