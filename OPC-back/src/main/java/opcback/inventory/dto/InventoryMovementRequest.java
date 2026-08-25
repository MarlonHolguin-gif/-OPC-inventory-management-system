package opcback.inventory.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import opcback.inventory.entity.MovementType;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record InventoryMovementRequest(
        @NotNull Long branchId,
        @NotNull Long productId,
        @NotNull MovementType movementType,
        @NotNull @DecimalMin(value = "0.0001", message = "La cantidad debe ser mayor que cero") BigDecimal quantity,
        BigDecimal unitCost,
        @NotBlank String reason,
        String referenceType,
        Long referenceId,
        LocalDateTime movementDate
) {
}
