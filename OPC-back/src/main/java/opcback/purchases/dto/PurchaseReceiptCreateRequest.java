package opcback.purchases.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record PurchaseReceiptCreateRequest(
        String notes,
        @NotEmpty(message = "La recepción debe tener al menos un ítem") List<@Valid PurchaseReceiptItemRequest> items
) {
}
