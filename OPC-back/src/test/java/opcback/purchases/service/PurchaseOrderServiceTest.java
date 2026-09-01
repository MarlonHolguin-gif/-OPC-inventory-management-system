package opcback.purchases.service;

import opcback.auth.entity.User;
import opcback.products.entity.Product;
import opcback.purchases.dto.PurchaseOrderCreateRequest;
import opcback.purchases.dto.PurchaseOrderItemRequest;
import opcback.purchases.dto.PurchaseOrderResponse;
import opcback.purchases.entity.PurchaseOrder;
import opcback.purchases.entity.PurchaseOrderStatus;
import opcback.purchases.entity.Supplier;
import opcback.purchases.repository.PurchaseOrderItemRepository;
import opcback.purchases.repository.PurchaseOrderRepository;
import opcback.purchases.repository.PurchaseReceiptItemRepository;
import opcback.purchases.repository.SupplierRepository;
import opcback.auth.repository.UserRepository;
import opcback.products.repository.ProductRepository;
import opcback.security.BranchAccessService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
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
    private BranchAccessService branchAccessService;
    @Mock
    private Authentication authentication;

    private PurchaseOrderService purchaseOrderService;
    private PurchaseOrder order;

    @BeforeEach
    void setUp() {
        purchaseOrderService = new PurchaseOrderService(
                purchaseOrderRepository, purchaseOrderItemRepository, purchaseReceiptItemRepository,
                supplierRepository, productRepository, userRepository, branchAccessService);

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
    void crearOrdenAplicaElDescuentoComoPorcentajeSobreCadaLinea() {
        when(authentication.getName()).thenReturn(EMAIL);

        Supplier supplier = new Supplier();
        supplier.setId(1L);
        supplier.setName("Proveedor de prueba");
        when(supplierRepository.findById(1L)).thenReturn(Optional.of(supplier));

        User user = new User();
        user.setId(7L);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));

        Product product = new Product();
        product.setId(10L);
        product.setSku("X-001");
        when(productRepository.findById(10L)).thenReturn(Optional.of(product));

        when(purchaseOrderRepository.count()).thenReturn(0L);
        when(purchaseOrderRepository.existsByOrderNumber(anyString())).thenReturn(false);
        when(purchaseOrderRepository.save(any(PurchaseOrder.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // 4 unidades a 1000 = 4000 bruto; 10 % de descuento = 400; subtotal de línea 3600.
        PurchaseOrderCreateRequest request = new PurchaseOrderCreateRequest(
                1L, BRANCH_ID, "30 dias",
                List.of(new PurchaseOrderItemRequest(10L, new BigDecimal("4"), new BigDecimal("1000"), new BigDecimal("10"))));

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
