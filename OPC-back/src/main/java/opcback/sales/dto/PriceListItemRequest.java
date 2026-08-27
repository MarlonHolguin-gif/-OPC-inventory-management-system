package opcback.sales.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record PriceListItemRequest(
        @NotNull Long productId,
        @NotNull @DecimalMin(value = "0", message = "El precio no puede ser negativo") BigDecimal price
) {
}
