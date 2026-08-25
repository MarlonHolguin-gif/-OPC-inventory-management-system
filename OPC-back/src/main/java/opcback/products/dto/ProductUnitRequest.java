package opcback.products.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record ProductUnitRequest(
        @NotNull Long unitId,
        @NotNull @DecimalMin(value = "0.0001", message = "El factor de conversión debe ser mayor que cero") BigDecimal conversionFactor,
        boolean isPurchaseUnit,
        boolean isSaleUnit
) {
}
