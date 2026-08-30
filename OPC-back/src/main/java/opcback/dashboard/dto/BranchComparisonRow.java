package opcback.dashboard.dto;

import java.math.BigDecimal;

/**
 * Una fila de la comparativa entre sucursales (endpoint solo ADMIN_GENERAL):
 * las mismas métricas de los demás endpoints del dashboard, una fila por
 * sucursal en vez de filtradas a una sola.
 */
public record BranchComparisonRow(
        Long branchId,
        String branchName,
        BigDecimal currentMonthSales,
        long lowStockProductsCount,
        long activeTransfersAsOrigin,
        long activeTransfersAsDestination
) {
}
