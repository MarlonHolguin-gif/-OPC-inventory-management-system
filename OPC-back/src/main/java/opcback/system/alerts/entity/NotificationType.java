package opcback.system.alerts.entity;

/**
 * Valores idénticos al ENUM de sy_notifications.type en
 * V1__create_schema.sql (ampliado en V15 y V17) — no cambiar sin cambiar
 * también la migración.
 *
 * Dos familias:
 *   - de stock (LOW_STOCK, HIGH_STOCK, OUT_OF_STOCK): identificadas por
 *     branch_id + product_id;
 *   - de flujo de trabajo (TRANSFER_SHORTAGE, TRANSFER_PENDING,
 *     PURCHASE_ORDER_PENDING): identificadas por reference_id (id de la
 *     transferencia u orden). Las _PENDING solo las ven el gerente de la
 *     sucursal y el administrador general.
 */
public enum NotificationType {
    LOW_STOCK,
    HIGH_STOCK,
    TRANSFER_SHORTAGE,
    OUT_OF_STOCK,
    TRANSFER_PENDING,
    PURCHASE_ORDER_PENDING
}
