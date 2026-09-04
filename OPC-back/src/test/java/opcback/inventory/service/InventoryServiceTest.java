package opcback.inventory.service;

import opcback.inventory.dto.InventoryResponse;
import opcback.inventory.dto.InventoryThresholdRequest;
import opcback.inventory.entity.Inventory;
import opcback.inventory.repository.InventoryRepository;
import opcback.products.entity.Product;
import opcback.products.repository.ProductRepository;
import opcback.security.BranchAccessService;
import opcback.system.alerts.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Configuración de umbrales de reabastecimiento (RF-05). El resto de
 * InventoryService es lectura pura sin lógica que probar.
 */
@ExtendWith(MockitoExtension.class)
class InventoryServiceTest {

    private static final Long BRANCH_ID = 1L;
    private static final Long PRODUCT_ID = 10L;
    private static final String EMAIL = "operador.bogota@opc.com";

    @Mock
    private InventoryRepository inventoryRepository;
    @Mock
    private ProductRepository productRepository;
    @Mock
    private BranchAccessService branchAccessService;
    @Mock
    private NotificationService notificationService;
    @Mock
    private Authentication authentication;

    private InventoryService inventoryService;

    @BeforeEach
    void setUp() {
        // InventoryAlertService es lógica pura — instancia real, sin stubs.
        inventoryService = new InventoryService(
                inventoryRepository, productRepository, branchAccessService, new InventoryAlertService(),
                notificationService);
        lenient().when(authentication.getName()).thenReturn(EMAIL);
        lenient().when(inventoryRepository.save(any(Inventory.class))).thenAnswer(call -> call.getArgument(0));
    }

    private Product product() {
        Product product = new Product();
        product.setId(PRODUCT_ID);
        product.setSku("ASE-001");
        product.setName("Detergente en polvo 3kg");
        return product;
    }

    private Inventory existingInventory() {
        Inventory inventory = new Inventory();
        inventory.setBranchId(BRANCH_ID);
        inventory.setProduct(product());
        inventory.initializeQuantity(new BigDecimal("40"));
        inventory.setMinStock(BigDecimal.ZERO);
        inventory.setMaxStock(BigDecimal.ZERO);
        inventory.setWeightedAvgCost(BigDecimal.ZERO);
        return inventory;
    }

    @Test
    void fijaLosUmbralesDeUnaFilaExistente() {
        Inventory inventory = existingInventory();
        when(inventoryRepository.findByBranchIdAndProductId(BRANCH_ID, PRODUCT_ID)).thenReturn(Optional.of(inventory));

        InventoryResponse response = inventoryService.updateThresholds(
                BRANCH_ID, PRODUCT_ID, new InventoryThresholdRequest(new BigDecimal("15"), new BigDecimal("120")),
                authentication);

        assertThat(response.minStock()).isEqualByComparingTo("15");
        assertThat(response.maxStock()).isEqualByComparingTo("120");
        assertThat(inventory.getMinStock()).isEqualByComparingTo("15");
        verify(branchAccessService).assertCanWrite(EMAIL, BRANCH_ID);
    }

    @Test
    void reconciliaLaNotificacionDeStockConElNuevoUmbral() {
        Inventory inventory = existingInventory();
        inventory.initializeQuantity(new BigDecimal("10")); // por debajo del nuevo mínimo
        when(inventoryRepository.findByBranchIdAndProductId(BRANCH_ID, PRODUCT_ID)).thenReturn(Optional.of(inventory));

        inventoryService.updateThresholds(
                BRANCH_ID, PRODUCT_ID, new InventoryThresholdRequest(new BigDecimal("50"), new BigDecimal("0")),
                authentication);

        // el nuevo mínimo (50) deja el stock (10) por debajo -> se reconcilia
        // la notificación con el nivel resultante (NotificationService decide
        // si crea, reemplaza o borra)
        verify(notificationService).reconcileStockNotification(
                eq(BRANCH_ID), any(Product.class),
                any(BigDecimal.class), any(BigDecimal.class), any(BigDecimal.class));
    }

    @Test
    void rechazaUnMaximoMenorQueElMinimo() {
        // La validación corta antes de tocar el repositorio.
        assertThatThrownBy(() -> inventoryService.updateThresholds(
                BRANCH_ID, PRODUCT_ID, new InventoryThresholdRequest(new BigDecimal("50"), new BigDecimal("10")),
                authentication))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("no puede ser menor");

        verify(inventoryRepository, never()).save(any());
    }

    @Test
    void creaLaFilaDeInventarioEnCeroSiElProductoNoLaTeniaEnLaSucursal() {
        when(inventoryRepository.findByBranchIdAndProductId(BRANCH_ID, PRODUCT_ID)).thenReturn(Optional.empty());
        when(productRepository.findById(PRODUCT_ID)).thenReturn(Optional.of(product()));

        inventoryService.updateThresholds(
                BRANCH_ID, PRODUCT_ID, new InventoryThresholdRequest(new BigDecimal("20"), new BigDecimal("0")),
                authentication);

        ArgumentCaptor<Inventory> captor = ArgumentCaptor.forClass(Inventory.class);
        verify(inventoryRepository).save(captor.capture());
        Inventory saved = captor.getValue();
        assertThat(saved.getBranchId()).isEqualTo(BRANCH_ID);
        assertThat(saved.getCurrentQuantity()).isEqualByComparingTo("0");
        assertThat(saved.getMinStock()).isEqualByComparingTo("20");
        assertThat(saved.getMaxStock()).isEqualByComparingTo("0");
    }
}
