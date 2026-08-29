package opcback.transfers.entity;

/**
 * Valores idénticos al ENUM de tr_transfers.route_priority en
 * V1__create_schema.sql. Toda transferencia se crea en 'MEDIUM' por
 * default; la sucursal origen (o ADMIN_GENERAL) puede fijarla/cambiarla con
 * PATCH /api/transfers/{id}/route-priority mientras la transferencia no
 * esté ya finalizada. El listado se puede filtrar por este campo
 * (GET /api/transfers?routePriority=...) y el reporte de cumplimiento
 * logístico agrupa por él.
 */
public enum TransferRoutePriority {
    HIGH,
    MEDIUM,
    LOW
}
