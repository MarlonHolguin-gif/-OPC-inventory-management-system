package opcback.sales.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record SaleItemRequest(
        @NotNull Long productId,
        // Unidad en la que se vende (null = unidad base del producto). La
        // cantidad va en esta unidad; el precio se toma de la lista (por
        // unidad base) y se multiplica por el factor.
        Long unitId,
        @NotNull @DecimalMin(value = "0.0001", message = "La cantidad debe ser mayor que cero") BigDecimal quantity,
        @DecimalMin(value = "0", message = "El descuento no puede ser negativo")
        @DecimalMax(value = "100", message = "El descuento no puede superar el 100%")
        BigDecimal discountPct
) {
}
