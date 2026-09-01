package opcback.dashboard.service;

import opcback.branches.repository.BranchRepository;
import opcback.dashboard.dto.ActiveTransfersImpactResponse;
import opcback.dashboard.dto.ProductRotationRow;
import opcback.inventory.entity.Inventory;
import opcback.inventory.entity.InventoryMovement;
import opcback.inventory.entity.MovementType;
import opcback.inventory.repository.InventoryMovementRepository;
import opcback.inventory.repository.InventoryRepository;
import opcback.inventory.service.InventoryService;
import opcback.products.entity.Product;
import opcback.sales.repository.SaleRepository;
import opcback.transfers.entity.Transfer;
import opcback.transfers.entity.TransferStatus;
import opcback.transfers.repository.TransferRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/**
 * Cubre las dos piezas nuevas del panel: la rotación que incluye los
 * productos sin ventas (baja demanda) y el desglose por estado de las
 * transferencias activas.
 */
@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    private static final Long BRANCH_ID = 1L;

    @Mock
    private SaleRepository saleRepository;
    @Mock
    private InventoryMovementRepository inventoryMovementRepository;
    @Mock
    private InventoryRepository inventoryRepository;
    @Mock
    private TransferRepository transferRepository;
    @Mock
    private InventoryService inventoryService;
    @Mock
    private BranchRepository branchRepository;

    private DashboardService dashboardService;

    @BeforeEach
    void setUp() {
        dashboardService = new DashboardService(saleRepository, inventoryMovementRepository, inventoryRepository,
                transferRepository, inventoryService, branchRepository);
    }

    private Product product(long id, String sku) {
        Product product = new Product();
        product.setId(id);
        product.setSku(sku);
        product.setName("Producto " + sku);
        product.setActive(true);
        return product;
    }

    private Inventory inventoryOf(Product product) {
        Inventory inventory = new Inventory();
        inventory.setBranchId(BRANCH_ID);
        inventory.setProduct(product);
        return inventory;
    }

    private InventoryMovement sale(Product product, String quantity) {
        InventoryMovement movement = new InventoryMovement();
        movement.setBranchId(BRANCH_ID);
        movement.setProduct(product);
        movement.setMovementType(MovementType.SALE);
        movement.setQuantity(new BigDecimal(quantity));
        return movement;
    }

    @Test
    void laRotacionIncluyeLosProductosSinVentasYLosOrdenaPrimeroEnBajaDemanda() {
        Product vendido = product(10L, "AAA");
        Product sinVentas = product(20L, "BBB");

        when(inventoryRepository.findByBranchId(BRANCH_ID))
                .thenReturn(List.of(inventoryOf(vendido), inventoryOf(sinVentas)));
        when(inventoryMovementRepository.findByOptionalBranchAndTypeAndDateRange(
                eq(BRANCH_ID), eq(MovementType.SALE), any(), any()))
                .thenReturn(List.of(sale(vendido, "7")));

        List<ProductRotationRow> ascending = dashboardService.inventoryRotation(BRANCH_ID, null, null, true);

        assertThat(ascending).extracting(ProductRotationRow::productSku).containsExactly("BBB", "AAA");
        assertThat(ascending.get(0).quantitySold()).isEqualByComparingTo("0");
        assertThat(ascending.get(1).quantitySold()).isEqualByComparingTo("7");
    }

    @Test
    void elImpactoDeTransferenciasActivasDesglosaPorEstado() {
        Transfer enPreparacion = new Transfer();
        enPreparacion.setOriginBranchId(BRANCH_ID);
        enPreparacion.setDestinationBranchId(2L);
        enPreparacion.setStatus(TransferStatus.IN_PREPARATION);

        Transfer enTransito = new Transfer();
        enTransito.setOriginBranchId(3L);
        enTransito.setDestinationBranchId(BRANCH_ID);
        enTransito.setStatus(TransferStatus.IN_TRANSIT);

        Transfer otraEnTransito = new Transfer();
        otraEnTransito.setOriginBranchId(BRANCH_ID);
        otraEnTransito.setDestinationBranchId(2L);
        otraEnTransito.setStatus(TransferStatus.IN_TRANSIT);

        when(transferRepository.findActiveInvolvingBranch(eq(BRANCH_ID), any()))
                .thenReturn(List.of(enPreparacion, enTransito, otraEnTransito));

        ActiveTransfersImpactResponse response = dashboardService.activeTransfersImpact(BRANCH_ID);

        assertThat(response.activeTransfersAsOrigin()).isEqualTo(2);
        assertThat(response.activeTransfersAsDestination()).isEqualTo(1);
        assertThat(response.statusBreakdown())
                .extracting(ActiveTransfersImpactResponse.StatusCount::status,
                        ActiveTransfersImpactResponse.StatusCount::count)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(TransferStatus.IN_PREPARATION, 1L),
                        org.assertj.core.groups.Tuple.tuple(TransferStatus.IN_TRANSIT, 2L));
    }
}
