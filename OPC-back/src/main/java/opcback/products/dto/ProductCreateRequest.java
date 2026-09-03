package opcback.products.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * `initialStock` es opcional: si viene (> 0), al crear el producto se genera
 * un movimiento de ajuste positivo por esa cantidad. El destino es:
 *  - `initialStockAllBranches = true`: una entrada por cada sucursal activa;
 *  - en otro caso, la sucursal `initialStockBranchId`.
 * Así el stock inicial sigue pasando por la única puerta que toca
 * `current_quantity`, no se escribe directo.
 */
public record ProductCreateRequest(
        @NotBlank String sku,
        @NotBlank String name,
        String description,
        @NotNull Long categoryId,
        @NotNull Long baseUnitId,
        BigDecimal referencePrice,
        BigDecimal initialStock,
        Long initialStockBranchId,
        Boolean initialStockAllBranches
) {

    /** true solo si viene explícitamente en true; null/ausente = false. */
    public boolean toAllBranches() {
        return Boolean.TRUE.equals(initialStockAllBranches);
    }
}
