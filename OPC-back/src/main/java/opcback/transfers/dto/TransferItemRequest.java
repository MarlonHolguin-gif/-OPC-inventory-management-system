package opcback.transfers.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record TransferItemRequest(
        @NotNull Long productId,
        @NotNull @DecimalMin(value = "0.0001", message = "La cantidad debe ser mayor que cero") BigDecimal quantity
) {
}
