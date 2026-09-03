package opcback.products.service;

import opcback.branches.entity.Branch;
import opcback.branches.repository.BranchRepository;
import opcback.inventory.dto.InventoryMovementRequest;
import opcback.inventory.service.InventoryMovementService;
import opcback.products.dto.ProductCreateRequest;
import opcback.products.dto.ProductResponse;
import opcback.products.entity.Category;
import opcback.products.entity.Product;
import opcback.products.entity.Unit;
import opcback.products.repository.CategoryRepository;
import opcback.products.repository.ProductRepository;
import opcback.products.repository.UnitRepository;
import opcback.system.alerts.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
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
    private BranchRepository branchRepository;
    @Mock
    private InventoryMovementService inventoryMovementService;
    @Mock
    private NotificationService notificationService;

    private ProductService productService;
    private Product product;
    private Category category;
    private Unit unit;

    @BeforeEach
    void setUp() {
        productService = new ProductService(
                productRepository, categoryRepository, unitRepository, branchRepository,
                inventoryMovementService, notificationService);

        unit = new Unit();
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

    @Test
    void stockInicialATodasLasSucursalesRegistraUnAjustePorCadaSucursalActiva() {
        stubProductCreation();
        when(branchRepository.findByActiveTrue()).thenReturn(List.of(branch(1L), branch(2L), branch(3L)));

        ProductCreateRequest request = new ProductCreateRequest(
                "ASE-002", "Jabón líquido 500ml", null, 2L, 1L, BigDecimal.TEN,
                BigDecimal.valueOf(40), null, true);

        productService.create(request, null);

        ArgumentCaptor<InventoryMovementRequest> captor = ArgumentCaptor.forClass(InventoryMovementRequest.class);
        verify(inventoryMovementService, times(3)).register(captor.capture(), eq(null));
        assertThat(captor.getAllValues())
                .extracting(InventoryMovementRequest::branchId)
                .containsExactlyInAnyOrder(1L, 2L, 3L);
        verify(notificationService, never()).notifyProductWithoutStock(any(), any());
    }

    @Test
    void crearUnProductoSinStockNotificaSinExistenciasEnCadaSucursalActiva() {
        stubProductCreation();
        when(branchRepository.findByActiveTrue()).thenReturn(List.of(branch(1L), branch(2L), branch(3L)));

        ProductCreateRequest request = new ProductCreateRequest(
                "ASE-002", "Jabón líquido 500ml", null, 2L, 1L, BigDecimal.TEN, null, null, false);

        productService.create(request, null);

        verify(inventoryMovementService, never()).register(any(), any());
        ArgumentCaptor<List<Long>> captor = ArgumentCaptor.forClass(List.class);
        verify(notificationService).notifyProductWithoutStock(any(Product.class), captor.capture());
        assertThat(captor.getValue()).containsExactlyInAnyOrder(1L, 2L, 3L);
    }

    @Test
    void crearUnProductoConStockEnUnaSucursalNotificaSoloLasRestantes() {
        stubProductCreation();
        when(branchRepository.findByActiveTrue()).thenReturn(List.of(branch(1L), branch(2L), branch(3L)));

        ProductCreateRequest request = new ProductCreateRequest(
                "ASE-002", "Jabón líquido 500ml", null, 2L, 1L, BigDecimal.TEN,
                BigDecimal.valueOf(40), 2L, false);

        productService.create(request, null);

        verify(inventoryMovementService, times(1)).register(any(), any());
        ArgumentCaptor<List<Long>> captor = ArgumentCaptor.forClass(List.class);
        verify(notificationService).notifyProductWithoutStock(any(Product.class), captor.capture());
        assertThat(captor.getValue()).containsExactlyInAnyOrder(1L, 3L);
    }

    private void stubProductCreation() {
        when(productRepository.existsBySku("ASE-002")).thenReturn(false);
        when(categoryRepository.findById(2L)).thenReturn(Optional.of(category));
        when(unitRepository.findById(1L)).thenReturn(Optional.of(unit));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> {
            Product saved = invocation.getArgument(0);
            saved.setId(9L);
            return saved;
        });
    }

    private static Branch branch(Long id) {
        Branch branch = new Branch();
        branch.setId(id);
        branch.setActive(true);
        return branch;
    }
}
