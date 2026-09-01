package opcback.inventory.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * Umbrales de reabastecimiento de un producto en una sucursal (RF-05). Un
 * `maxStock` de 0 significa "sin tope máximo" — así lo interpreta
 * InventoryAlertService.
 */
public record InventoryThresholdRequest(
        @NotNull @DecimalMin(value = "0", message = "El stock mínimo no puede ser negativo") BigDecimal minStock,
        @NotNull @DecimalMin(value = "0", message = "El stock máximo no puede ser negativo") BigDecimal maxStock
) {
}
