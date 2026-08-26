package opcback.purchases.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record PurchaseReceiptItemRequest(
        @NotNull Long purchaseOrderItemId,
        @NotNull @DecimalMin(value = "0.0001", message = "La cantidad recibida debe ser mayor que cero") BigDecimal receivedQuantity
) {
}
