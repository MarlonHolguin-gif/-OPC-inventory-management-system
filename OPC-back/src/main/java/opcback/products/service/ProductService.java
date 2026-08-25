package opcback.products.service;

import lombok.RequiredArgsConstructor;
import opcback.exception.ResourceNotFoundException;
import opcback.products.dto.ProductCreateRequest;
import opcback.products.dto.ProductResponse;
import opcback.products.dto.ProductUpdateRequest;
import opcback.products.entity.Category;
import opcback.products.entity.Product;
import opcback.products.entity.Unit;
import opcback.products.repository.CategoryRepository;
import opcback.products.repository.ProductRepository;
import opcback.products.repository.UnitRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final UnitRepository unitRepository;

    /**
     * Listado completo (incluye inactivos) — es el que debe usarse para
     * resolver product_id en histórico de movimientos, no solo el catálogo
     * de venta.
     */
    public List<ProductResponse> listAll() {
        return productRepository.findAll().stream().map(ProductResponse::from).toList();
    }

    /**
     * Catálogo de venta: solo productos activos.
     */
    public List<ProductResponse> listCatalog() {
        return productRepository.findByActiveTrue().stream().map(ProductResponse::from).toList();
    }

    public ProductResponse getById(Long id) {
        return ProductResponse.from(findProductOrThrow(id));
    }

    @Transactional
    public ProductResponse create(ProductCreateRequest request) {
        if (productRepository.existsBySku(request.sku())) {
            throw new IllegalStateException("Ya existe un producto con el SKU: " + request.sku());
        }

        Product product = new Product();
        product.setSku(request.sku());
        product.setName(request.name());
        product.setDescription(request.description());
        product.setCategory(findCategoryOrThrow(request.categoryId()));
        product.setBaseUnit(findUnitOrThrow(request.baseUnitId()));
        product.setReferencePrice(request.referencePrice() != null ? request.referencePrice() : BigDecimal.ZERO);
        product.setActive(true);

        LocalDateTime now = LocalDateTime.now();
        product.setCreatedAt(now);
        product.setUpdatedAt(now);

        return ProductResponse.from(productRepository.save(product));
    }

    @Transactional
    public ProductResponse update(Long id, ProductUpdateRequest request) {
        Product product = findProductOrThrow(id);
        product.setName(request.name());
        product.setDescription(request.description());
        product.setCategory(findCategoryOrThrow(request.categoryId()));
        product.setBaseUnit(findUnitOrThrow(request.baseUnitId()));
        product.setReferencePrice(request.referencePrice() != null ? request.referencePrice() : BigDecimal.ZERO);
        product.setUpdatedAt(LocalDateTime.now());

        return ProductResponse.from(productRepository.save(product));
    }

    @Transactional
    public ProductResponse deactivate(Long id) {
        Product product = findProductOrThrow(id);
        product.setActive(false);
        product.setUpdatedAt(LocalDateTime.now());
        return ProductResponse.from(productRepository.save(product));
    }

    private Product findProductOrThrow(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado: " + id));
    }

    private Category findCategoryOrThrow(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Categoría no encontrada: " + id));
    }

    private Unit findUnitOrThrow(Long id) {
        return unitRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Unidad no encontrada: " + id));
    }
}
