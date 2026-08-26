package opcback.purchases.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record PurchaseOrderItemRequest(
        @NotNull Long productId,
        @NotNull @DecimalMin(value = "0.0001", message = "La cantidad debe ser mayor que cero") BigDecimal quantity,
        @NotNull @DecimalMin(value = "0", message = "El precio unitario no puede ser negativo") BigDecimal unitPrice,
        BigDecimal discount
) {
}
