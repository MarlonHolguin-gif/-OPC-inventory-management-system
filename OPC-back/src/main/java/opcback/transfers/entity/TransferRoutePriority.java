package opcback.transfers.entity;

/**
 * Valores idénticos al ENUM de tr_transfers.route_priority en
 * V1__create_schema.sql. Fuera del alcance de las tarjetas actuales de
 * Transferencias (pertenece a la futura épica [LOG] de clasificación de
 * rutas) — hoy solo se usa el default 'MEDIUM' al crear una transferencia.
 */
public enum TransferRoutePriority {
    HIGH,
    MEDIUM,
    LOW
}
