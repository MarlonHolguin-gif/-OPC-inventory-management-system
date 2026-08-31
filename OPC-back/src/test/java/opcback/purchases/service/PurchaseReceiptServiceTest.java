package opcback.purchases.service;

import opcback.auth.entity.User;
import opcback.auth.repository.UserRepository;
import opcback.inventory.entity.Inventory;
import opcback.inventory.repository.InventoryMovementRepository;
import opcback.inventory.repository.InventoryRepository;
import opcback.inventory.service.InventoryAlertService;
import opcback.inventory.service.InventoryMovementService;
import opcback.products.entity.Product;
import opcback.products.repository.ProductRepository;
import opcback.purchases.dto.PurchaseReceiptCreateRequest;
import opcback.purchases.dto.PurchaseReceiptItemRequest;
import opcback.purchases.dto.PurchaseReceiptResponse;
import opcback.purchases.entity.PurchaseOrder;
import opcback.purchases.entity.PurchaseOrderItem;
import opcback.purchases.entity.PurchaseOrderStatus;
import opcback.purchases.entity.PurchaseReceipt;
import opcback.purchases.entity.Supplier;
import opcback.purchases.repository.PurchaseOrderItemRepository;
import opcback.purchases.repository.PurchaseOrderRepository;
import opcback.purchases.repository.PurchaseReceiptItemRepository;
import opcback.purchases.repository.PurchaseReceiptRepository;
import opcback.security.BranchAccessService;
import opcback.system.alerts.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Caso de prueba numérico documentado (Card 4): recepción de una orden de
 * compra recalcula INVENTARIO.costo_promedio_ponderado con la fórmula
 * nuevo_costo = (stock_actual*costo_actual + cantidad_recibida*costo_unitario)
 * / (stock_actual + cantidad_recibida).
 *
 * No se mockea InventoryMovementService — se instancia real (con sus
 * propios repositorios mockeados) para probar la cadena completa
 * recepción -> movimiento de inventario -> recálculo de costo, no solo que
 * PurchaseReceiptService "llama a algo".
 */
@ExtendWith(MockitoExtension.class)
class PurchaseReceiptServiceTest {

    private static final Long BRANCH_ID = 1L;
    private static final Long PRODUCT_ID = 10L;
    private static final Long ORDER_ID = 100L;
    private static final Long ORDER_ITEM_ID = 200L;
    private static final String EMAIL = "operador.bogota@opc.com";

    @Mock
    private PurchaseOrderRepository purchaseOrderRepository;
    @Mock
    private PurchaseOrderItemRepository purchaseOrderItemRepository;
    @Mock
    private PurchaseReceiptRepository purchaseReceiptRepository;
    @Mock
    private PurchaseReceiptItemRepository purchaseReceiptItemRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private BranchAccessService branchAccessService;
    @Mock
    private ProductRepository productRepository;
    @Mock
    private InventoryRepository inventoryRepository;
    @Mock
    private InventoryMovementRepository inventoryMovementRepository;
    @Mock
    private NotificationService notificationService;
    @Mock
    private Authentication authentication;

    private PurchaseReceiptService purchaseReceiptService;
    private Inventory inventory;
    private PurchaseOrder order;
    private PurchaseOrderItem orderItem;
    private Product product;

    @BeforeEach
    void setUp() {
        InventoryMovementService inventoryMovementService = new InventoryMovementService(
                branchAccessService, productRepository, userRepository, inventoryRepository,
                inventoryMovementRepository, new InventoryAlertService(), notificationService);

        purchaseReceiptService = new PurchaseReceiptService(
                purchaseOrderRepository, purchaseOrderItemRepository, purchaseReceiptRepository,
                purchaseReceiptItemRepository, userRepository, branchAccessService, inventoryMovementService);

        when(authentication.getName()).thenReturn(EMAIL);

        User user = new User();
        user.setId(4L);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));

        Product product = new Product();
        product.setId(PRODUCT_ID);
        product.setSku("X-001");

        Supplier supplier = new Supplier();
        supplier.setId(1L);
        supplier.setName("Proveedor de prueba");

        order = new PurchaseOrder();
        order.setId(ORDER_ID);
        order.setSupplier(supplier);
        order.setBranchId(BRANCH_ID);
        order.setOrderNumber("OC-TEST-000001");
        order.setStatus(PurchaseOrderStatus.SENT);

        orderItem = new PurchaseOrderItem();
        orderItem.setId(ORDER_ITEM_ID);
        orderItem.setPurchaseOrder(order);
        orderItem.setProduct(product);
        orderItem.setQuantity(new BigDecimal("10"));
        orderItem.setUnitPrice(new BigDecimal("200"));
        orderItem.setDiscount(BigDecimal.ZERO);
        orderItem.setSubtotal(new BigDecimal("2000"));
        order.getItems().add(orderItem);

        when(purchaseOrderRepository.findById(ORDER_ID)).thenReturn(Optional.of(order));
        when(purchaseOrderItemRepository.findById(ORDER_ITEM_ID)).thenReturn(Optional.of(orderItem));
        when(purchaseReceiptItemRepository.sumReceivedByPurchaseOrderItemId(ORDER_ITEM_ID)).thenReturn(BigDecimal.ZERO);

        // Inventario existente antes de la recepción: 50 unidades a costo 100.
        inventory = new Inventory();
        inventory.setBranchId(BRANCH_ID);
        inventory.initializeQuantity(new BigDecimal("50"));
        inventory.setWeightedAvgCost(new BigDecimal("100"));
        inventory.setMinStock(BigDecimal.ZERO);
        inventory.setMaxStock(BigDecimal.ZERO);

        this.product = product;
    }

    /**
     * Solo el camino feliz llega a resolver el producto y a guardar algo —
     * el test de rechazo por exceso nunca llega ahí (falla antes).
     */
    private void stubHappyPath() {
        when(productRepository.findById(PRODUCT_ID)).thenReturn(Optional.of(product));
        when(inventoryRepository.findByBranchIdAndProductId(BRANCH_ID, PRODUCT_ID)).thenReturn(Optional.of(inventory));
        when(purchaseReceiptRepository.save(any(PurchaseReceipt.class))).thenAnswer(invocation -> {
            PurchaseReceipt receipt = invocation.getArgument(0);
            receipt.setId(500L);
            return receipt;
        });
        when(inventoryMovementRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(inventoryRepository.save(any(Inventory.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(purchaseOrderRepository.save(any(PurchaseOrder.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void recepcionCompletaRecalculaElCostoPromedioPonderadoConElPrecioDeLaOrden() {
        stubHappyPath();
        // 50 unidades a 100 + 10 unidades recibidas a 200 (precio de la orden)
        // -> (50*100 + 10*200) / (50+10) = 7000 / 60 = 116.6666667
        PurchaseReceiptCreateRequest request = new PurchaseReceiptCreateRequest(
                "recepción completa",
                java.util.List.of(new PurchaseReceiptItemRequest(ORDER_ITEM_ID, new BigDecimal("10"))));

        PurchaseReceiptResponse response = purchaseReceiptService.register(ORDER_ID, request, authentication);

        assertThat(response.orderStatusAfterReceipt()).isEqualTo(PurchaseOrderStatus.FULLY_RECEIVED);
        assertThat(inventory.getCurrentQuantity()).isEqualByComparingTo("60");
        assertThat(inventory.getWeightedAvgCost()).isEqualByComparingTo("116.6666667");
        assertThat(order.getStatus()).isEqualTo(PurchaseOrderStatus.FULLY_RECEIVED);
    }

    @Test
    void recepcionParcialQueExcedeLoPendienteSeRechaza() {
        when(purchaseReceiptItemRepository.sumReceivedByPurchaseOrderItemId(ORDER_ITEM_ID))
                .thenReturn(new BigDecimal("6"));

        PurchaseReceiptCreateRequest request = new PurchaseReceiptCreateRequest(
                "exceso",
                java.util.List.of(new PurchaseReceiptItemRequest(ORDER_ITEM_ID, new BigDecimal("5"))));

        org.assertj.core.api.Assertions.assertThatThrownBy(
                        () -> purchaseReceiptService.register(ORDER_ID, request, authentication))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("excede lo pendiente por recibir");
    }
}
