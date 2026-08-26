package opcback.inventory.service;

import opcback.auth.entity.User;
import opcback.auth.repository.UserRepository;
import opcback.inventory.dto.InventoryMovementRequest;
import opcback.inventory.dto.InventoryMovementResponse;
import opcback.inventory.entity.Inventory;
import opcback.inventory.entity.InventoryMovement;
import opcback.inventory.entity.MovementType;
import opcback.inventory.repository.InventoryMovementRepository;
import opcback.inventory.repository.InventoryRepository;
import opcback.products.entity.Product;
import opcback.products.repository.ProductRepository;
import opcback.security.BranchAccessService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Pruebas unitarias de InventoryMovementService — sin Spring context ni BD
 * real, todos los repositorios van mockeados. Cubre los 3 casos pedidos por
 * la tarjeta: ingreso normal, retiro con stock insuficiente, y
 * actualización de costo promedio ponderado tras un ingreso.
 */
@ExtendWith(MockitoExtension.class)
class InventoryMovementServiceTest {

    private static final Long BRANCH_ID = 1L;
    private static final Long PRODUCT_ID = 1L;
    private static final String EMAIL = "operador.bogota@opc.com";

    @Mock
    private BranchAccessService branchAccessService;
    @Mock
    private ProductRepository productRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private InventoryRepository inventoryRepository;
    @Mock
    private InventoryMovementRepository inventoryMovementRepository;
    @Mock
    private Authentication authentication;

    private InventoryMovementService inventoryMovementService;

    @BeforeEach
    void setUp() {
        inventoryMovementService = new InventoryMovementService(
                branchAccessService, productRepository, userRepository, inventoryRepository, inventoryMovementRepository);

        when(authentication.getName()).thenReturn(EMAIL);

        User user = new User();
        user.setId(4L);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));

        Product product = new Product();
        product.setId(PRODUCT_ID);
        product.setSku("TEST-001");
        when(productRepository.findById(PRODUCT_ID)).thenReturn(Optional.of(product));
    }

    /**
     * Solo los tests que de verdad llegan a guardar (los que no rechazan el
     * movimiento) necesitan estos stubs — Mockito con strict stubbing marca
     * como error un stub definido pero nunca usado en un test dado.
     */
    private void stubSaves() {
        when(inventoryMovementRepository.save(any(InventoryMovement.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(inventoryRepository.save(any(Inventory.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    private Inventory existingInventory(String quantity, String weightedAvgCost) {
        Inventory inventory = new Inventory();
        inventory.setBranchId(BRANCH_ID);
        inventory.initializeQuantity(new BigDecimal(quantity));
        inventory.setMinStock(BigDecimal.ZERO);
        inventory.setMaxStock(BigDecimal.ZERO);
        inventory.setWeightedAvgCost(new BigDecimal(weightedAvgCost));
        return inventory;
    }

    private InventoryMovementRequest request(MovementType type, String quantity, String unitCost) {
        return new InventoryMovementRequest(
                BRANCH_ID, PRODUCT_ID, type, new BigDecimal(quantity),
                unitCost != null ? new BigDecimal(unitCost) : null,
                "prueba unitaria", null, null, null);
    }

    @Test
    void ingresoNormalSumaAlStockActual() {
        stubSaves();
        Inventory inventory = existingInventory("50", "0");
        when(inventoryRepository.findByBranchIdAndProductId(BRANCH_ID, PRODUCT_ID)).thenReturn(Optional.of(inventory));

        InventoryMovementResponse response = inventoryMovementService.register(
                request(MovementType.PURCHASE, "10", null), authentication);

        assertThat(response.newCurrentQuantity()).isEqualByComparingTo("60");
        verify(inventoryMovementRepository).save(any(InventoryMovement.class));
        verify(inventoryRepository).save(any(Inventory.class));
    }

    @Test
    void retiroConStockInsuficienteRechazaYNoPersisteNada() {
        Inventory inventory = existingInventory("5", "0");
        when(inventoryRepository.findByBranchIdAndProductId(BRANCH_ID, PRODUCT_ID)).thenReturn(Optional.of(inventory));

        assertThatThrownBy(() -> inventoryMovementService.register(
                request(MovementType.SALE, "10", null), authentication))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Stock insuficiente");

        // ni el movimiento ni el inventario se tocan cuando se rechaza el retiro
        verify(inventoryMovementRepository, never()).save(any());
        verify(inventoryRepository, never()).save(any());
    }

    @Test
    void ingresoConCostoActualizaElCostoPromedioPonderado() {
        stubSaves();
        // 80 unidades a 1750 + 20 unidades a 2000 -> (80*1750 + 20*2000) / 100 = 1800
        Inventory inventory = existingInventory("80", "1750");
        when(inventoryRepository.findByBranchIdAndProductId(BRANCH_ID, PRODUCT_ID)).thenReturn(Optional.of(inventory));

        inventoryMovementService.register(request(MovementType.PURCHASE, "20", "2000"), authentication);

        assertThat(inventory.getWeightedAvgCost()).isEqualByComparingTo("1800");
        assertThat(inventory.getCurrentQuantity()).isEqualByComparingTo("100");
    }

    @Test
    void ingresoSinCostoNoAlteraElCostoPromedioPonderado() {
        stubSaves();
        Inventory inventory = existingInventory("80", "1750");
        when(inventoryRepository.findByBranchIdAndProductId(BRANCH_ID, PRODUCT_ID)).thenReturn(Optional.of(inventory));

        inventoryMovementService.register(request(MovementType.POSITIVE_ADJUSTMENT, "20", null), authentication);

        assertThat(inventory.getWeightedAvgCost()).isEqualByComparingTo("1750");
        assertThat(inventory.getCurrentQuantity()).isEqualByComparingTo("100");
    }
}
