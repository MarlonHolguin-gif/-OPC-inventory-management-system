package opcback.transfers.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record ReceivePartialItemRequest(
        @NotNull Long transferItemId,
        @NotNull @DecimalMin(value = "0", message = "La cantidad recibida no puede ser negativa") BigDecimal receivedQuantity
) {
}
