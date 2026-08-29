package opcback.transfers.dto;

import opcback.transfers.entity.TransferRoutePriority;

import java.math.BigDecimal;

/**
 * Una fila del reporte de cumplimiento logístico: de las transferencias de
 * esta sucursal origen + prioridad de ruta que ya llegaron y tenían fecha
 * estimada, qué porcentaje llegó a tiempo (fecha_llegada_real <=
 * fecha_estimada_llegada).
 */
public record LogisticsComplianceRow(
        Long originBranchId,
        TransferRoutePriority routePriority,
        long totalTransfers,
        long onTimeTransfers,
        BigDecimal onTimePercentage
) {
}
