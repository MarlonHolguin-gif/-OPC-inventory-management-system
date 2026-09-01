package opcback.purchases.dto;

import opcback.purchases.entity.PurchaseOrderItem;

import java.math.BigDecimal;

public record PurchaseOrderItemResponse(
        Long id,
        Long productId,
        String productSku,
        String productName,
        BigDecimal quantity,
        BigDecimal unitPrice,
        BigDecimal discountPercentage,
        BigDecimal discount,
        BigDecimal subtotal,
        BigDecimal receivedQuantity
) {
    public static PurchaseOrderItemResponse from(PurchaseOrderItem item, BigDecimal receivedQuantity) {
        return new PurchaseOrderItemResponse(
                item.getId(),
                item.getProduct().getId(),
                item.getProduct().getSku(),
                item.getProduct().getName(),
                item.getQuantity(),
                item.getUnitPrice(),
                item.getDiscountPercentage(),
                item.getDiscount(),
                item.getSubtotal(),
                receivedQuantity);
    }
}
