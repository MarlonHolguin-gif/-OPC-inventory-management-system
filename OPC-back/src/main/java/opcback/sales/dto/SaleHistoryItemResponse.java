package opcback.sales.dto;

import opcback.sales.entity.SaleItem;
import opcback.sales.entity.SaleStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record SaleHistoryItemResponse(
        Long saleId,
        String saleNumber,
        LocalDateTime saleDate,
        SaleStatus status,
        Long branchId,
        Long customerId,
        String customerName,
        Long sellerId,
        Long productId,
        String productSku,
        String productName,
        BigDecimal quantity,
        BigDecimal unitPrice,
        BigDecimal subtotal
) {
    public static SaleHistoryItemResponse from(SaleItem item) {
        return new SaleHistoryItemResponse(
                item.getSale().getId(),
                item.getSale().getSaleNumber(),
                item.getSale().getSaleDate(),
                item.getSale().getStatus(),
                item.getSale().getBranchId(),
                item.getSale().getCustomer() != null ? item.getSale().getCustomer().getId() : null,
                item.getSale().getCustomer() != null ? item.getSale().getCustomer().getName() : null,
                item.getSale().getSellerId(),
                item.getProduct().getId(),
                item.getProduct().getSku(),
                item.getProduct().getName(),
                item.getQuantity(),
                item.getUnitPrice(),
                item.getSubtotal());
    }
}
