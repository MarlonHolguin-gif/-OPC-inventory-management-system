package opcback.transfers.entity;

/**
 * Valores idénticos al ENUM de tr_transfers.urgency en
 * V1__create_schema.sql — no cambiar sin cambiar también la migración.
 */
public enum TransferUrgency {
    LOW,
    MEDIUM,
    HIGH,
    CRITICAL
}
