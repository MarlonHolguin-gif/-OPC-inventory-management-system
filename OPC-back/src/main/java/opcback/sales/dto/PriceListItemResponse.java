package opcback.sales.dto;

import opcback.sales.entity.PriceListItem;

import java.math.BigDecimal;

public record PriceListItemResponse(
        Long id,
        Long productId,
        String productSku,
        String productName,
        BigDecimal price
) {
    public static PriceListItemResponse from(PriceListItem item) {
        return new PriceListItemResponse(item.getId(), item.getProduct().getId(), item.getProduct().getSku(),
                item.getProduct().getName(), item.getPrice());
    }
}
