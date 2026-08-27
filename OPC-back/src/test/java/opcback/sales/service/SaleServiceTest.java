package opcback.sales.service;

import opcback.auth.entity.User;
import opcback.auth.repository.UserRepository;
import opcback.inventory.entity.Inventory;
import opcback.inventory.repository.InventoryMovementRepository;
import opcback.inventory.repository.InventoryRepository;
import opcback.inventory.service.InventoryMovementService;
import opcback.products.entity.Product;
import opcback.products.repository.ProductRepository;
import opcback.sales.dto.SaleCreateRequest;
import opcback.sales.dto.SaleItemRequest;
import opcback.sales.dto.SaleResponse;
import opcback.sales.entity.PriceList;
import opcback.sales.entity.PriceListItem;
import opcback.sales.repository.CustomerRepository;
import opcback.sales.repository.PriceListItemRepository;
import opcback.sales.repository.PriceListRepository;
import opcback.sales.repository.SaleItemRepository;
import opcback.sales.repository.SaleRepository;
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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Pruebas unitarias de SaleService — sin Spring context ni BD real. No se
 * mockea InventoryMovementService: se instancia real (con sus propios
 * repositorios mockeados), igual que en PurchaseReceiptServiceTest, para
 * probar la cadena completa venta -> movimiento de inventario, no solo que
 * SaleService "llama a algo".
 *
 * Casos y números acordados explícitamente con el usuario antes de escribir
 * este archivo (no son ejemplos ilustrativos):
 * 1. Chocorramo, cantidad 10, precio 3500, sin descuento -> total 35.000.
 * 2. Pastel, cantidad 20, precio 15.000, descuento 20% -> total 240.000.
 * 3. Pastel (10x15.000, 0%) + Chocorramo (5x3.500, 10%) + Leche (15x4.800,
 *    10%) -> subtotal 239.500, descuento 8.950, total 230.550.
 */
@ExtendWith(MockitoExtension.class)
class SaleServiceTest {

    private static final Long BRANCH_ID = 1L;
    private static final Long VIGENT_LIST_ID = 10L;
    private static final Long NO_VIGENT_LIST_ID = 20L;
    private static final Long CHOCORRAMO_ID = 1L;
    private static final Long PASTEL_ID = 2L;
    private static final Long LECHE_ID = 3L;
    private static final String EMAIL = "operador.bogota@opc.com";

    @Mock
    private SaleRepository saleRepository;
    @Mock
    private SaleItemRepository saleItemRepository;
    @Mock
    private PriceListRepository priceListRepository;
    @Mock
    private PriceListItemRepository priceListItemRepository;
    @Mock
    private CustomerRepository customerRepository;
    @Mock
    private ProductRepository productRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private BranchAccessService branchAccessService;
    @Mock
    private InventoryRepository inventoryRepository;
    @Mock
    private InventoryMovementRepository inventoryMovementRepository;
    @Mock
    private Authentication authentication;

    private SaleService saleService;

    @BeforeEach
    void setUp() {
        InventoryMovementService inventoryMovementService = new InventoryMovementService(
                branchAccessService, productRepository, userRepository, inventoryRepository, inventoryMovementRepository);

        saleService = new SaleService(
                saleRepository, saleItemRepository, priceListRepository, priceListItemRepository,
                customerRepository, productRepository, userRepository, branchAccessService, inventoryMovementService);

        when(authentication.getName()).thenReturn(EMAIL);
    }

    private void stubSeller() {
        User user = new User();
        user.setId(7L);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
    }

    private void stubVigentPriceList() {
        PriceList priceList = new PriceList();
        priceList.setId(VIGENT_LIST_ID);
        priceList.setName("Lista Test");
        priceList.setActive(true);
        when(priceListRepository.findById(VIGENT_LIST_ID)).thenReturn(Optional.of(priceList));
    }

    private void stubNoVigentPriceList() {
        PriceList priceList = new PriceList();
        priceList.setId(NO_VIGENT_LIST_ID);
        priceList.setName("Lista Vencida");
        priceList.setActive(false);
        when(priceListRepository.findById(NO_VIGENT_LIST_ID)).thenReturn(Optional.of(priceList));
    }

    private void stubProduct(Long id, String sku, String name) {
        Product product = new Product();
        product.setId(id);
        product.setSku(sku);
        product.setName(name);
        when(productRepository.findById(id)).thenReturn(Optional.of(product));
    }

    private void stubPrice(Long listId, Long productId, String price) {
        PriceListItem item = new PriceListItem();
        item.setPrice(new BigDecimal(price));
        when(priceListItemRepository.findByPriceListIdAndProductId(listId, productId)).thenReturn(Optional.of(item));
    }

    private void stubInventory(Long productId, String quantity) {
        Inventory inventory = new Inventory();
        inventory.setBranchId(BRANCH_ID);
        inventory.initializeQuantity(new BigDecimal(quantity));
        inventory.setMinStock(BigDecimal.ZERO);
        inventory.setMaxStock(BigDecimal.ZERO);
        inventory.setWeightedAvgCost(BigDecimal.ZERO);
        when(inventoryRepository.findByBranchIdAndProductId(BRANCH_ID, productId)).thenReturn(Optional.of(inventory));
    }

    /**
     * Solo los casos que llegan a confirmar la venta necesitan estos stubs
     * de guardado — los de rechazo (lista no vigente, producto sin precio)
     * fallan antes de llegar aquí.
     */
    private void stubSaves() {
        when(saleRepository.save(any())).thenAnswer(invocation -> {
            var sale = invocation.getArgument(0, opcback.sales.entity.Sale.class);
            sale.setId(900L);
            return sale;
        });
        when(inventoryMovementRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(inventoryRepository.save(any(Inventory.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    private SaleItemRequest item(Long productId, String quantity, String discountPct) {
        return new SaleItemRequest(productId, new BigDecimal(quantity),
                discountPct != null ? new BigDecimal(discountPct) : null);
    }

    private SaleCreateRequest request(Long priceListId, Long customerId, SaleItemRequest... items) {
        return new SaleCreateRequest(BRANCH_ID, priceListId, customerId, List.of(items));
    }

    @Test
    void ventaSimpleSinDescuentoCalculaSubtotalYTotal() {
        stubSeller();
        stubVigentPriceList();
        stubProduct(CHOCORRAMO_ID, "CHO-001", "Chocorramo");
        stubPrice(VIGENT_LIST_ID, CHOCORRAMO_ID, "3500");
        stubInventory(CHOCORRAMO_ID, "100");
        stubSaves();

        SaleResponse response = saleService.register(
                request(VIGENT_LIST_ID, null, item(CHOCORRAMO_ID, "10", null)), authentication);

        assertThat(response.subtotal()).isEqualByComparingTo("35000");
        assertThat(response.totalDiscount()).isEqualByComparingTo("0");
        assertThat(response.total()).isEqualByComparingTo("35000");
        assertThat(response.items().get(0).subtotal()).isEqualByComparingTo("35000");
    }

    @Test
    void ventaConDescuentoPorItemCalculaDescuentoYTotal() {
        stubSeller();
        stubVigentPriceList();
        stubProduct(PASTEL_ID, "PAS-001", "Pastel");
        stubPrice(VIGENT_LIST_ID, PASTEL_ID, "15000");
        stubInventory(PASTEL_ID, "100");
        stubSaves();

        SaleResponse response = saleService.register(
                request(VIGENT_LIST_ID, null, item(PASTEL_ID, "20", "20")), authentication);

        assertThat(response.subtotal()).isEqualByComparingTo("300000");
        assertThat(response.totalDiscount()).isEqualByComparingTo("60000");
        assertThat(response.total()).isEqualByComparingTo("240000");
    }

    @Test
    void ventaConVariosItemsSumaCorrectamenteTotalesConDescuentosMixtos() {
        stubSeller();
        stubVigentPriceList();
        stubProduct(PASTEL_ID, "PAS-001", "Pastel");
        stubProduct(CHOCORRAMO_ID, "CHO-001", "Chocorramo");
        stubProduct(LECHE_ID, "LEC-001", "Leche");
        stubPrice(VIGENT_LIST_ID, PASTEL_ID, "15000");
        stubPrice(VIGENT_LIST_ID, CHOCORRAMO_ID, "3500");
        stubPrice(VIGENT_LIST_ID, LECHE_ID, "4800");
        stubInventory(PASTEL_ID, "100");
        stubInventory(CHOCORRAMO_ID, "100");
        stubInventory(LECHE_ID, "100");
        stubSaves();

        SaleResponse response = saleService.register(
                request(VIGENT_LIST_ID, null,
                        item(PASTEL_ID, "10", null),
                        item(CHOCORRAMO_ID, "5", "10"),
                        item(LECHE_ID, "15", "10")),
                authentication);

        assertThat(response.subtotal()).isEqualByComparingTo("239500");
        assertThat(response.totalDiscount()).isEqualByComparingTo("8950");
        assertThat(response.total()).isEqualByComparingTo("230550");

        assertThat(response.items().get(0).subtotal()).isEqualByComparingTo("150000"); // Pastel, sin descuento
        assertThat(response.items().get(1).subtotal()).isEqualByComparingTo("15750");  // Chocorramo, 10%
        assertThat(response.items().get(2).subtotal()).isEqualByComparingTo("64800");  // Leche, 10%
    }

    @Test
    void ventaConListaDePreciosNoVigenteSeRechaza() {
        stubNoVigentPriceList();

        SaleCreateRequest request = request(NO_VIGENT_LIST_ID, null, item(CHOCORRAMO_ID, "10", null));

        assertThatThrownBy(() -> saleService.register(request, authentication))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("no está vigente");

        verify(saleRepository, never()).save(any());
    }

    @Test
    void ventaConProductoSinPrecioEnLaListaSeRechaza() {
        stubSeller();
        stubVigentPriceList();
        stubProduct(CHOCORRAMO_ID, "CHO-001", "Chocorramo");
        // Sin stubPrice: la lista vigente no tiene precio para este producto.

        SaleCreateRequest request = request(VIGENT_LIST_ID, null, item(CHOCORRAMO_ID, "10", null));

        assertThatThrownBy(() -> saleService.register(request, authentication))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("No hay precio definido");

        verify(saleRepository, never()).save(any());
    }

    @Test
    void ventaDeMostradorSinClienteQuedaConCustomerIdNulo() {
        stubSeller();
        stubVigentPriceList();
        stubProduct(CHOCORRAMO_ID, "CHO-001", "Chocorramo");
        stubPrice(VIGENT_LIST_ID, CHOCORRAMO_ID, "3500");
        stubInventory(CHOCORRAMO_ID, "100");
        stubSaves();

        SaleResponse response = saleService.register(
                request(VIGENT_LIST_ID, null, item(CHOCORRAMO_ID, "10", null)), authentication);

        assertThat(response.customerId()).isNull();
        assertThat(response.customerName()).isNull();
        verify(customerRepository, never()).findById(any());
    }
}
