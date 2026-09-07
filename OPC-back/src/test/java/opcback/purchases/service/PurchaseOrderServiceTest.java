package opcback.purchases.service;

import opcback.auth.entity.User;
import opcback.products.entity.Product;
import opcback.products.entity.Unit;
import opcback.products.repository.UnitRepository;
import opcback.products.service.ProductUnitService;
import opcback.purchases.dto.PurchaseHistoryItemResponse;
import opcback.purchases.dto.PurchaseOrderCreateRequest;
import opcback.purchases.dto.PurchaseOrderItemRequest;
import opcback.purchases.dto.PurchaseOrderResponse;
import opcback.purchases.entity.PurchaseOrder;
import opcback.purchases.entity.PurchaseOrderItem;
import opcback.purchases.entity.PurchaseOrderStatus;
import opcback.purchases.entity.Supplier;
import opcback.purchases.repository.PurchaseOrderItemRepository;
import opcback.purchases.repository.PurchaseOrderRepository;
import opcback.purchases.repository.PurchaseReceiptItemRepository;
import opcback.purchases.repository.SupplierRepository;
import opcback.auth.repository.UserRepository;
import opcback.products.repository.ProductRepository;
import opcback.security.BranchAccessService;
import opcback.system.alerts.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

/**
 * Transiciones de estado de una orden de compra (Card "gestionar órdenes"):
 * borrador -> enviada al proveedor, y cancelación mientras la orden no esté
 * completamente recibida.
 */
@ExtendWith(MockitoExtension.class)
class PurchaseOrderServiceTest {

    private static final Long ORDER_ID = 100L;
    private static final Long BRANCH_ID = 1L;
    private static final String EMAIL = "operador.bogota@opc.com";

    @Mock
    private PurchaseOrderRepository purchaseOrderRepository;
    @Mock
    private PurchaseOrderItemRepository purchaseOrderItemRepository;
    @Mock
    private PurchaseReceiptItemRepository purchaseReceiptItemRepository;
    @Mock
    private SupplierRepository supplierRepository;
    @Mock
    private ProductRepository productRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private UnitRepository unitRepository;
    @Mock
    private BranchAccessService branchAccessService;
    @Mock
    private ProductUnitService productUnitService;
    @Mock
    private NotificationService notificationService;
    @Mock
    private Authentication authentication;

    private PurchaseOrderService purchaseOrderService;
    private PurchaseOrder order;

    @BeforeEach
    void setUp() {
        purchaseOrderService = new PurchaseOrderService(
                purchaseOrderRepository, purchaseOrderItemRepository, purchaseReceiptItemRepository,
                supplierRepository, productRepository, unitRepository, userRepository, branchAccessService,
                productUnitService, notificationService);

        Supplier supplier = new Supplier();
        supplier.setId(1L);
        supplier.setName("Proveedor de prueba");

        order = new PurchaseOrder();
        order.setId(ORDER_ID);
        order.setSupplier(supplier);
        order.setBranchId(BRANCH_ID);
        order.setOrderNumber("OC-TEST-000001");
        order.setStatus(PurchaseOrderStatus.DRAFT);

        // lenient: el test de creación no busca una orden existente.
        lenient().when(purchaseOrderRepository.findById(ORDER_ID)).thenReturn(Optional.of(order));
    }

    @Test
    void marcarComoEnviadaCambiaElEstadoDeBorradorASent() {
        when(authentication.getName()).thenReturn(EMAIL);
        when(purchaseOrderRepository.save(any(PurchaseOrder.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PurchaseOrderResponse response = purchaseOrderService.markAsSent(ORDER_ID, authentication);

        assertThat(response.status()).isEqualTo(PurchaseOrderStatus.SENT);
        assertThat(order.getStatus()).isEqualTo(PurchaseOrderStatus.SENT);
    }

    @Test
    void marcarComoEnviadaFallaSiLaOrdenNoEstaEnBorrador() {
        when(authentication.getName()).thenReturn(EMAIL);
        order.setStatus(PurchaseOrderStatus.SENT);

        assertThatThrownBy(() -> purchaseOrderService.markAsSent(ORDER_ID, authentication))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("borrador");
    }

    @Test
    void cancelarMarcaLaOrdenComoCancelled() {
        when(authentication.getName()).thenReturn(EMAIL);
        when(purchaseOrderRepository.save(any(PurchaseOrder.class))).thenAnswer(invocation -> invocation.getArgument(0));
        order.setStatus(PurchaseOrderStatus.SENT);

        PurchaseOrderResponse response = purchaseOrderService.cancel(ORDER_ID, authentication);

        assertThat(response.status()).isEqualTo(PurchaseOrderStatus.CANCELLED);
    }

    @Test
    void cancelarFallaSiLaOrdenYaFueRecibidaPorCompleto() {
        when(authentication.getName()).thenReturn(EMAIL);
        order.setStatus(PurchaseOrderStatus.FULLY_RECEIVED);

        assertThatThrownBy(() -> purchaseOrderService.cancel(ORDER_ID, authentication))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("FULLY_RECEIVED");
    }

    @Test
    void historicoFiltraPorEstadoYResuelveElNombreDelResponsable() {
        Supplier supplier = new Supplier();
        supplier.setId(1L);
        supplier.setName("Proveedor de prueba");

        PurchaseOrder historyOrder = new PurchaseOrder();
        historyOrder.setId(200L);
        historyOrder.setOrderNumber("OC-2026-000009");
        historyOrder.setOrderDate(LocalDateTime.now());
        historyOrder.setStatus(PurchaseOrderStatus.SENT);
        historyOrder.setSupplier(supplier);
        historyOrder.setUserId(7L);
        historyOrder.setBranchId(3L);

        Unit baseUnit = new Unit();
        baseUnit.setAbbreviation("UN");
        Product product = new Product();
        product.setId(10L);
        product.setSku("X-001");
        product.setName("Producto X");
        product.setBaseUnit(baseUnit);

        PurchaseOrderItem item = new PurchaseOrderItem();
        item.setPurchaseOrder(historyOrder);
        item.setProduct(product);
        item.setQuantity(new BigDecimal("3"));
        item.setUnitPrice(new BigDecimal("1000"));
        item.setDiscountPercentage(BigDecimal.ZERO);
        item.setDiscount(BigDecimal.ZERO);
        item.setSubtotal(new BigDecimal("3000"));

        when(purchaseOrderItemRepository.findHistory(
                isNull(), isNull(), eq(PurchaseOrderStatus.SENT), isNull(), isNull()))
                .thenReturn(List.of(item));

        User responsible = new User();
        responsible.setId(7L);
        responsible.setName("Ana Torres");
        when(userRepository.findAllById(Set.of(7L))).thenReturn(List.of(responsible));

        List<PurchaseHistoryItemResponse> result =
                purchaseOrderService.history(null, null, PurchaseOrderStatus.SENT, null, null);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).responsibleName()).isEqualTo("Ana Torres");
        assertThat(result.get(0).status()).isEqualTo(PurchaseOrderStatus.SENT);
        assertThat(result.get(0).branchId()).isEqualTo(3L);
    }

    @Test
    void crearOrdenConElMismoProductoEnDosLineasSeRechaza() {
        when(authentication.getName()).thenReturn(EMAIL);

        PurchaseOrderCreateRequest request = new PurchaseOrderCreateRequest(
                1L, BRANCH_ID, "30 dias",
                List.of(
                        new PurchaseOrderItemRequest(10L, null, new BigDecimal("4"), new BigDecimal("1000"), BigDecimal.ZERO),
                        new PurchaseOrderItemRequest(10L, null, new BigDecimal("2"), new BigDecimal("1000"), BigDecimal.ZERO)));

        assertThatThrownBy(() -> purchaseOrderService.create(request, authentication))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("no puede repetir el mismo producto");
    }

    @Test
    void crearOrdenAplicaElDescuentoComoPorcentajeSobreCadaLinea() {
        when(authentication.getName()).thenReturn(EMAIL);

        Supplier supplier = new Supplier();
        supplier.setId(1L);
        supplier.setName("Proveedor de prueba");
        when(supplierRepository.findById(1L)).thenReturn(Optional.of(supplier));

        User user = new User();
        user.setId(7L);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));

        Unit baseUnit = new Unit();
        baseUnit.setId(1L);
        baseUnit.setAbbreviation("UN");
        Product product = new Product();
        product.setId(10L);
        product.setSku("X-001");
        product.setBaseUnit(baseUnit);
        when(productRepository.findById(10L)).thenReturn(Optional.of(product));

        when(purchaseOrderRepository.count()).thenReturn(0L);
        when(purchaseOrderRepository.existsByOrderNumber(anyString())).thenReturn(false);
        when(purchaseOrderRepository.save(any(PurchaseOrder.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // 4 unidades a 1000 = 4000 bruto; 10 % de descuento = 400; subtotal de línea 3600.
        PurchaseOrderCreateRequest request = new PurchaseOrderCreateRequest(
                1L, BRANCH_ID, "30 dias",
                List.of(new PurchaseOrderItemRequest(10L, null, new BigDecimal("4"), new BigDecimal("1000"), new BigDecimal("10"))));

        PurchaseOrderResponse response = purchaseOrderService.create(request, authentication);

        assertThat(response.subtotal()).isEqualByComparingTo("4000");
        assertThat(response.totalDiscount()).isEqualByComparingTo("400");
        assertThat(response.total()).isEqualByComparingTo("3600");
        assertThat(response.items()).singleElement().satisfies(item -> {
            assertThat(item.discountPercentage()).isEqualByComparingTo("10");
            assertThat(item.discount()).isEqualByComparingTo("400");
            assertThat(item.subtotal()).isEqualByComparingTo("3600");
        });
    }
}
