package opcback.products.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * `initialStock` + `initialStockBranchId` son opcionales: si vienen, al
 * crear el producto se genera un movimiento de ajuste positivo por esa
 * cantidad en esa sucursal (así el stock inicial sigue pasando por la
 * única puerta que toca `current_quantity`, no se escribe directo).
 */
public record ProductCreateRequest(
        @NotBlank String sku,
        @NotBlank String name,
        String description,
        @NotNull Long categoryId,
        @NotNull Long baseUnitId,
        BigDecimal referencePrice,
        BigDecimal initialStock,
        Long initialStockBranchId
) {
}
