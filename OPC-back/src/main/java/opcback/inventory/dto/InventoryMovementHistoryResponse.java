package opcback.inventory.dto;

import opcback.inventory.entity.InventoryMovement;
import opcback.inventory.entity.MovementType;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Una fila del historial de movimientos de inventario (sección 3.1 del PDF).
 * El nombre del responsable se resuelve en el backend porque /api/users es
 * solo para administradores — mismo criterio que el histórico de ventas.
 */
public record InventoryMovementHistoryResponse(
        Long id,
        LocalDateTime movementDate,
        Long branchId,
        Long responsibleUserId,
        String responsibleName,
        Long productId,
        String productSku,
        String productName,
        MovementType movementType,
        BigDecimal quantity,
        String reason
) {
    public static InventoryMovementHistoryResponse from(InventoryMovement movement, String responsibleName) {
        return new InventoryMovementHistoryResponse(
                movement.getId(),
                movement.getMovementDate(),
                movement.getBranchId(),
                movement.getResponsibleUserId(),
                responsibleName,
                movement.getProduct().getId(),
                movement.getProduct().getSku(),
                movement.getProduct().getName(),
                movement.getMovementType(),
                movement.getQuantity(),
                movement.getReason());
    }
}
