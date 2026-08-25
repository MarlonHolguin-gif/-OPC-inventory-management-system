package opcback.products.dto;

import java.math.BigDecimal;

public record UnitConversionResponse(
        Long productId,
        BigDecimal quantity,
        Long fromUnitId,
        Long toUnitId,
        BigDecimal convertedQuantity
) {
}
