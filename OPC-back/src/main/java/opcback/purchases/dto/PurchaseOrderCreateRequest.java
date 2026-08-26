package opcback.purchases.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record PurchaseOrderCreateRequest(
        @NotNull Long supplierId,
        @NotNull Long branchId,
        String paymentTerms,
        @NotEmpty(message = "La orden debe tener al menos un ítem") List<@Valid PurchaseOrderItemRequest> items
) {
}
