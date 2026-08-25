package opcback.products.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * El SKU no es editable — es la clave de negocio del producto.
 */
public record ProductUpdateRequest(
        @NotBlank String name,
        String description,
        @NotNull Long categoryId,
        @NotNull Long baseUnitId,
        BigDecimal referencePrice
) {
}
