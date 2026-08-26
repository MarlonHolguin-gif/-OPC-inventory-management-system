package opcback.purchases.entity;

/**
 * Valores idénticos al ENUM de tr_purchase_orders.status en
 * V1__create_schema.sql — no cambiar sin cambiar también la migración.
 */
public enum PurchaseOrderStatus {
    DRAFT,
    SENT,
    PARTIALLY_RECEIVED,
    FULLY_RECEIVED,
    CANCELLED
}
