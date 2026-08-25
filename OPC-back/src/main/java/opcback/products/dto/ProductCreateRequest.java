package opcback.products.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record ProductCreateRequest(
        @NotBlank String sku,
        @NotBlank String name,
        String description,
        @NotNull Long categoryId,
        @NotNull Long baseUnitId,
        BigDecimal referencePrice
) {
}
