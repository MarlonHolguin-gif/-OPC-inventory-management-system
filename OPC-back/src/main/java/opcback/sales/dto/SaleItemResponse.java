package opcback.sales.dto;

import opcback.sales.entity.SaleItem;

import java.math.BigDecimal;

public record SaleItemResponse(
        Long id,
        Long productId,
        String productSku,
        String productName,
        Long unitId,
        String unitAbbreviation,
        BigDecimal quantity,
        BigDecimal unitPrice,
        BigDecimal discountPct,
        BigDecimal subtotal
) {
    public static SaleItemResponse from(SaleItem item) {
        String unitAbbreviation = item.getUnit() != null
                ? item.getUnit().getAbbreviation()
                : item.getProduct().getBaseUnit().getAbbreviation();
        return new SaleItemResponse(item.getId(), item.getProduct().getId(), item.getProduct().getSku(),
                item.getProduct().getName(), item.getUnit() != null ? item.getUnit().getId() : null,
                unitAbbreviation, item.getQuantity(), item.getUnitPrice(),
                item.getDiscountPct(), item.getSubtotal());
    }
}
