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
        Long supplierId,
        String supplierName,
        Long productId,
        String productSku,
        String productName,
        BigDecimal quantity,
        BigDecimal unitPrice,
        BigDecimal subtotal
) {
    public static PurchaseHistoryItemResponse from(PurchaseOrderItem item) {
        return new PurchaseHistoryItemResponse(
                item.getPurchaseOrder().getId(),
                item.getPurchaseOrder().getOrderNumber(),
                item.getPurchaseOrder().getOrderDate(),
                item.getPurchaseOrder().getStatus(),
                item.getPurchaseOrder().getSupplier().getId(),
                item.getPurchaseOrder().getSupplier().getName(),
                item.getProduct().getId(),
                item.getProduct().getSku(),
                item.getProduct().getName(),
                item.getQuantity(),
                item.getUnitPrice(),
                item.getSubtotal());
    }
}
