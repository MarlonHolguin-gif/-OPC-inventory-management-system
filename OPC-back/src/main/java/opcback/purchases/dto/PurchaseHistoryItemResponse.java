package opcback.purchases.dto;

import opcback.purchases.entity.PurchaseOrderItem;
import opcback.purchases.entity.PurchaseOrderStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PurchaseHistoryItemResponse(
        Long orderId,
        String orderNumber,
        LocalDateTime orderDate,
        PurchaseOrderStatus status,
        String paymentTerms,
        Long supplierId,
        String supplierName,
        Long productId,
        String productSku,
        String productName,
        String unitAbbreviation,
        BigDecimal quantity,
        BigDecimal unitPrice,
        BigDecimal discountPercentage,
        BigDecimal discount,
        BigDecimal subtotal
) {
    public static PurchaseHistoryItemResponse from(PurchaseOrderItem item) {
        return new PurchaseHistoryItemResponse(
                item.getPurchaseOrder().getId(),
                item.getPurchaseOrder().getOrderNumber(),
                item.getPurchaseOrder().getOrderDate(),
                item.getPurchaseOrder().getStatus(),
                item.getPurchaseOrder().getPaymentTerms(),
                item.getPurchaseOrder().getSupplier().getId(),
                item.getPurchaseOrder().getSupplier().getName(),
                item.getProduct().getId(),
                item.getProduct().getSku(),
                item.getProduct().getName(),
                item.getUnit() != null ? item.getUnit().getAbbreviation() : item.getProduct().getBaseUnit().getAbbreviation(),
                item.getQuantity(),
                item.getUnitPrice(),
                item.getDiscountPercentage(),
                item.getDiscount(),
                item.getSubtotal());
    }
}
