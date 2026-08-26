package opcback.purchases.dto;

import opcback.purchases.entity.PurchaseOrderStatus;
import opcback.purchases.entity.ReceiptType;

import java.time.LocalDateTime;

public record PurchaseReceiptResponse(
        Long id,
        Long purchaseOrderId,
        String orderNumber,
        ReceiptType receiptType,
        LocalDateTime receiptDate,
        String notes,
        PurchaseOrderStatus orderStatusAfterReceipt
) {
}
