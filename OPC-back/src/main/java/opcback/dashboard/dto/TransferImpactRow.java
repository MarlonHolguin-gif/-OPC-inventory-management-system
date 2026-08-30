package opcback.dashboard.dto;

import java.math.BigDecimal;

/**
 * Efecto proyectado de las transferencias activas sobre un producto en la
 * sucursal consultada: projectedOutbound es lo que va a salir (la sucursal
 * es origen), projectedInbound lo que va a entrar (es destino) — ver
 * DashboardService.pendingQuantity() para cómo se calcula cada cantidad
 * según el estado real de la transferencia.
 */
public record TransferImpactRow(
        Long productId,
        String productSku,
        String productName,
        BigDecimal projectedOutbound,
        BigDecimal projectedInbound
) {
}
