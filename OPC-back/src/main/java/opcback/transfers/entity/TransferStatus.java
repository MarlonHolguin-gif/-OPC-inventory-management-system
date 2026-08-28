package opcback.transfers.entity;

/**
 * Valores idénticos al ENUM de tr_transfers.status (y de
 * tr_transfer_events.status) en V1__create_schema.sql — no cambiar sin
 * cambiar también la migración.
 */
public enum TransferStatus {
    REQUESTED,
    IN_PREPARATION,
    IN_TRANSIT,
    FULLY_RECEIVED,
    PARTIALLY_RECEIVED,
    CANCELLED
}
