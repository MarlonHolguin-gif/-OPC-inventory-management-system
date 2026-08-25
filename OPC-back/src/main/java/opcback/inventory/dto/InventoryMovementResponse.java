package opcback.inventory.dto;

import opcback.inventory.entity.InventoryMovement;
import opcback.inventory.entity.MovementType;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record InventoryMovementResponse(
        Long id,
        Long branchId,
        Long productId,
        MovementType movementType,
        BigDecimal quantity,
        BigDecimal unitCost,
        String reason,
        Long responsibleUserId,
        BigDecimal newCurrentQuantity,
        LocalDateTime movementDate
) {
    public static InventoryMovementResponse from(InventoryMovement movement, BigDecimal newCurrentQuantity) {
        return new InventoryMovementResponse(
                movement.getId(),
                movement.getBranchId(),
                movement.getProduct().getId(),
                movement.getMovementType(),
                movement.getQuantity(),
                movement.getUnitCost(),
                movement.getReason(),
                movement.getResponsibleUserId(),
                newCurrentQuantity,
                movement.getMovementDate());
    }
}
