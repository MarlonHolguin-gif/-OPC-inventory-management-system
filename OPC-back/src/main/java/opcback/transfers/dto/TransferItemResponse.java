package opcback.transfers.dto;

import opcback.transfers.entity.TransferItem;

import java.math.BigDecimal;

public record TransferItemResponse(
        Long id,
        Long productId,
        String productSku,
        String productName,
        BigDecimal requestedQuantity,
        BigDecimal shippedQuantity,
        BigDecimal receivedQuantity,
        BigDecimal difference
) {
    public static TransferItemResponse from(TransferItem item) {
        return new TransferItemResponse(
                item.getId(),
                item.getProduct().getId(),
                item.getProduct().getSku(),
                item.getProduct().getName(),
                item.getRequestedQuantity(),
                item.getShippedQuantity(),
                item.getReceivedQuantity(),
                item.getDifference());
    }
}
