package opcback.purchases.dto;

import opcback.purchases.entity.PurchaseOrderItem;

import java.math.BigDecimal;

public record PurchaseOrderItemResponse(
        Long id,
        Long productId,
        String productSku,
        String productName,
        Long unitId,
        String unitAbbreviation,
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
                item.getUnit() != null ? item.getUnit().getId() : null,
                item.getUnit() != null ? item.getUnit().getAbbreviation() : item.getProduct().getBaseUnit().getAbbreviation(),
                item.getQuantity(),
                item.getUnitPrice(),
                item.getDiscountPercentage(),
                item.getDiscount(),
                item.getSubtotal(),
                receivedQuantity);
    }
}
