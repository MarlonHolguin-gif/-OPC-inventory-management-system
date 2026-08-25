package opcback.products.dto;

import opcback.products.entity.Product;

import java.math.BigDecimal;

public record ProductResponse(
        Long id,
        String sku,
        String name,
        String description,
        Long categoryId,
        String categoryName,
        Long baseUnitId,
        String baseUnitAbbreviation,
        BigDecimal referencePrice,
        boolean active
) {
    public static ProductResponse from(Product product) {
        return new ProductResponse(
                product.getId(),
                product.getSku(),
                product.getName(),
                product.getDescription(),
                product.getCategory().getId(),
                product.getCategory().getName(),
                product.getBaseUnit().getId(),
                product.getBaseUnit().getAbbreviation(),
                product.getReferencePrice(),
                product.isActive());
    }
}
