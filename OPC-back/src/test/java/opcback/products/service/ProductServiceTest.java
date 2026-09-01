package opcback.products.service;

import opcback.inventory.service.InventoryMovementService;
import opcback.products.dto.ProductResponse;
import opcback.products.entity.Category;
import opcback.products.entity.Product;
import opcback.products.entity.Unit;
import opcback.products.repository.CategoryRepository;
import opcback.products.repository.ProductRepository;
import opcback.products.repository.UnitRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Reactivación de un producto: solo cubre la regla de negocio nueva (no se
 * reactiva un producto cuya categoría está inactiva). El resto de
 * ProductService es CRUD directo sin lógica que probar.
 */
@ExtendWith(MockitoExtension.class)
class ProductServiceTest {

    private static final Long PRODUCT_ID = 5L;

    @Mock
    private ProductRepository productRepository;
    @Mock
    private CategoryRepository categoryRepository;
    @Mock
    private UnitRepository unitRepository;
    @Mock
    private InventoryMovementService inventoryMovementService;

    private ProductService productService;
    private Product product;
    private Category category;

    @BeforeEach
    void setUp() {
        productService = new ProductService(
                productRepository, categoryRepository, unitRepository, inventoryMovementService);

        Unit unit = new Unit();
        unit.setId(1L);
        unit.setAbbreviation("UN");

        category = new Category();
        category.setId(2L);
        category.setName("Aseo");
        category.setActive(true);

        product = new Product();
        product.setId(PRODUCT_ID);
        product.setSku("ASE-001");
        product.setName("Detergente en polvo 3kg");
        product.setCategory(category);
        product.setBaseUnit(unit);
        product.setReferencePrice(BigDecimal.ZERO);
        product.setActive(false);

        lenient().when(productRepository.findById(PRODUCT_ID)).thenReturn(Optional.of(product));
        lenient().when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void reactivarUnProductoConCategoriaActivaLoDejaActivo() {
        ProductResponse response = productService.reactivate(PRODUCT_ID);

        assertThat(response.active()).isTrue();
        assertThat(product.isActive()).isTrue();
    }

    @Test
    void noSePuedeReactivarUnProductoSiSuCategoriaEstaInactiva() {
        category.setActive(false);

        assertThatThrownBy(() -> productService.reactivate(PRODUCT_ID))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("categoría «Aseo» está inactiva");

        assertThat(product.isActive()).isFalse();
        verify(productRepository, never()).save(any());
    }
}
