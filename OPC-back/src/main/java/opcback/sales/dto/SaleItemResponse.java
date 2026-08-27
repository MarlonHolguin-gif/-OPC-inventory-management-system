package opcback.sales.dto;

import opcback.sales.entity.SaleItem;

import java.math.BigDecimal;

public record SaleItemResponse(
        Long id,
        Long productId,
        String productSku,
        String productName,
        BigDecimal quantity,
        BigDecimal unitPrice,
        BigDecimal discountPct,
        BigDecimal subtotal
) {
    public static SaleItemResponse from(SaleItem item) {
        return new SaleItemResponse(item.getId(), item.getProduct().getId(), item.getProduct().getSku(),
                item.getProduct().getName(), item.getQuantity(), item.getUnitPrice(), item.getDiscountPct(),
                item.getSubtotal());
    }
}
