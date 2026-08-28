package opcback.transfers.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record PrepareItemRequest(
        @NotNull Long transferItemId,
        @NotNull @DecimalMin(value = "0", message = "La cantidad enviada no puede ser negativa") BigDecimal shippedQuantity
) {
}
