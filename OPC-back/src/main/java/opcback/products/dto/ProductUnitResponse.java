package opcback.products.dto;

import opcback.products.entity.ProductUnit;

import java.math.BigDecimal;

public record ProductUnitResponse(
        Long unitId,
        String unitName,
        String unitAbbreviation,
        BigDecimal conversionFactor,
        boolean isPurchaseUnit,
        boolean isSaleUnit
) {
    public static ProductUnitResponse from(ProductUnit productUnit) {
        return new ProductUnitResponse(
                productUnit.getUnit().getId(),
                productUnit.getUnit().getName(),
                productUnit.getUnit().getAbbreviation(),
                productUnit.getConversionFactor(),
                productUnit.isPurchaseUnit(),
                productUnit.isSaleUnit());
    }
}
