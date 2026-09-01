package opcback.purchases.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record PurchaseOrderItemRequest(
        @NotNull Long productId,
        @NotNull @DecimalMin(value = "0.0001", message = "La cantidad debe ser mayor que cero") BigDecimal quantity,
        @NotNull @DecimalMin(value = "0", message = "El precio unitario no puede ser negativo") BigDecimal unitPrice,
        @DecimalMin(value = "0", message = "El porcentaje de descuento no puede ser negativo")
        @DecimalMax(value = "100", message = "El porcentaje de descuento no puede superar 100")
        BigDecimal discountPercentage
) {
}
