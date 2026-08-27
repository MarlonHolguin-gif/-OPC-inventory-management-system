package opcback.sales.entity;

/**
 * Valores idénticos al ENUM de tr_sales.status en V1__create_schema.sql —
 * no cambiar sin cambiar también la migración.
 */
public enum SaleStatus {
    CONFIRMED,
    VOIDED
}
