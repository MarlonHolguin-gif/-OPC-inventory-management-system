package opcback.purchases.dto;

import opcback.purchases.entity.PurchaseOrder;
import opcback.purchases.entity.PurchaseOrderStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record PurchaseOrderResponse(
        Long id,
        String orderNumber,
        Long supplierId,
        String supplierName,
        Long branchId,
        LocalDateTime orderDate,
        String paymentTerms,
        PurchaseOrderStatus status,
        BigDecimal subtotal,
        BigDecimal totalDiscount,
        BigDecimal total,
        List<PurchaseOrderItemResponse> items
) {
    public static PurchaseOrderResponse from(PurchaseOrder order, List<PurchaseOrderItemResponse> items) {
        return new PurchaseOrderResponse(
                order.getId(),
                order.getOrderNumber(),
                order.getSupplier().getId(),
                order.getSupplier().getName(),
                order.getBranchId(),
                order.getOrderDate(),
                order.getPaymentTerms(),
                order.getStatus(),
                order.getSubtotal(),
                order.getTotalDiscount(),
                order.getTotal(),
                items);
    }
}
