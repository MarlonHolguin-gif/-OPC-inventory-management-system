package opcback.products.service;

import lombok.RequiredArgsConstructor;
import opcback.exception.ResourceNotFoundException;
import opcback.products.dto.ProductUnitRequest;
import opcback.products.dto.ProductUnitResponse;
import opcback.products.dto.UnitConversionResponse;
import opcback.products.entity.Product;
import opcback.products.entity.ProductUnit;
import opcback.products.entity.Unit;
import opcback.products.repository.ProductRepository;
import opcback.products.repository.ProductUnitRepository;
import opcback.products.repository.UnitRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.MathContext;
import java.util.List;

/**
 * Maneja las unidades alternativas de un producto (ma_product_units) y la
 * conversión entre ellas. La unidad base del producto (ma_products.base_unit_id)
 * siempre tiene factor implícito 1 — no necesita fila propia en ma_product_units.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProductUnitService {

    private final ProductRepository productRepository;
    private final UnitRepository unitRepository;
    private final ProductUnitRepository productUnitRepository;

    public List<ProductUnitResponse> listByProduct(Long productId) {
        assertProductExists(productId);
        return productUnitRepository.findByProductId(productId).stream()
                .map(ProductUnitResponse::from)
                .toList();
    }

    @Transactional
    public ProductUnitResponse assign(Long productId, ProductUnitRequest request) {
        Product product = findProductOrThrow(productId);
        Unit unit = findUnitOrThrow(request.unitId());

        ProductUnit productUnit = productUnitRepository.findByProductIdAndUnitId(productId, request.unitId())
                .orElseGet(ProductUnit::new);
        productUnit.setProduct(product);
        productUnit.setUnit(unit);
        productUnit.setConversionFactor(request.conversionFactor());
        productUnit.setPurchaseUnit(request.isPurchaseUnit());
        productUnit.setSaleUnit(request.isSaleUnit());

        return ProductUnitResponse.from(productUnitRepository.save(productUnit));
    }

    @Transactional
    public void remove(Long productId, Long unitId) {
        productUnitRepository.findByProductIdAndUnitId(productId, unitId)
                .ifPresent(productUnitRepository::delete);
    }

    /**
     * Convierte una cantidad de una unidad a otra para un producto,
     * pasando por la unidad base como referencia común: factor(from) /
     * factor(to) * cantidad. La unidad base tiene factor 1.
     */
    public UnitConversionResponse convert(Long productId, BigDecimal quantity, Long fromUnitId, Long toUnitId) {
        Product product = findProductOrThrow(productId);

        BigDecimal fromFactor = factorFor(product, fromUnitId);
        BigDecimal toFactor = factorFor(product, toUnitId);

        BigDecimal converted = quantity.multiply(fromFactor)
                .divide(toFactor, new MathContext(10));

        return new UnitConversionResponse(productId, quantity, fromUnitId, toUnitId, converted);
    }

    private BigDecimal factorFor(Product product, Long unitId) {
        if (unitId.equals(product.getBaseUnit().getId())) {
            return BigDecimal.ONE;
        }
        return productUnitRepository.findByProductIdAndUnitId(product.getId(), unitId)
                .map(ProductUnit::getConversionFactor)
                .orElseThrow(() -> new IllegalStateException(
                        "El producto " + product.getId() + " no tiene definida la unidad " + unitId));
    }

    private void assertProductExists(Long productId) {
        if (!productRepository.existsById(productId)) {
            throw new ResourceNotFoundException("Producto no encontrado: " + productId);
        }
    }

    private Product findProductOrThrow(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado: " + id));
    }

    private Unit findUnitOrThrow(Long id) {
        return unitRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Unidad no encontrada: " + id));
    }
}
