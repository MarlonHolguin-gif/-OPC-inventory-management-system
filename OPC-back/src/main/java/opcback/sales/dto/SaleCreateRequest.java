package opcback.sales.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record SaleCreateRequest(
        @NotNull Long branchId,
        @NotNull Long priceListId,
        Long customerId,
        @NotEmpty(message = "La venta debe tener al menos un ítem") List<@Valid SaleItemRequest> items
) {
}
