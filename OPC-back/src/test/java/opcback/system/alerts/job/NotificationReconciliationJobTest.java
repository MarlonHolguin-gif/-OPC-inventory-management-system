package opcback.system.alerts.job;

import opcback.inventory.entity.Inventory;
import opcback.inventory.repository.InventoryRepository;
import opcback.products.entity.Product;
import opcback.purchases.entity.PurchaseOrder;
import opcback.purchases.repository.PurchaseOrderRepository;
import opcback.system.alerts.service.NotificationService;
import opcback.transfers.entity.Transfer;
import opcback.transfers.repository.TransferRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * El chequeo programado recorre el estado actual del sistema y delega la
 * decisión en NotificationService. Aquí solo se comprueba que llama una vez
 * por fila, con resurfaceRead = true, y que una fila que falla no aborta el
 * barrido — tanto para stock como para el flujo (transferencias / órdenes).
 */
@ExtendWith(MockitoExtension.class)
class NotificationReconciliationJobTest {

    @Mock
    private InventoryRepository inventoryRepository;
    @Mock
    private TransferRepository transferRepository;
    @Mock
    private PurchaseOrderRepository purchaseOrderRepository;
    @Mock
    private NotificationService notificationService;
    @InjectMocks
    private NotificationReconciliationJob job;

    private static Inventory inventoryRow(Long branchId, String quantity) {
        Product product = new Product();
        product.setId(1L);
        product.setSku("SKU-1");
        product.setName("Producto 1");

        Inventory inventory = new Inventory();
        inventory.setBranchId(branchId);
        inventory.setProduct(product);
        inventory.initializeQuantity(new BigDecimal(quantity));
        inventory.setMinStock(new BigDecimal("10"));
        inventory.setMaxStock(BigDecimal.ZERO);
        return inventory;
    }

    @Test
    void reconciliaCadaFilaDeInventarioPidiendoResurgirLasLeidas() {
        when(inventoryRepository.findAllWithProduct())
                .thenReturn(List.of(inventoryRow(1L, "5"), inventoryRow(2L, "40")));

        job.reconcileStockNotifications();

        verify(notificationService, times(2)).reconcileStockNotification(
                any(), any(), any(BigDecimal.class), any(BigDecimal.class), any(BigDecimal.class), eq(true));
    }

    @Test
    void unaFilaQueFallaNoDetieneElBarrido() {
        when(inventoryRepository.findAllWithProduct())
                .thenReturn(List.of(inventoryRow(1L, "5"), inventoryRow(2L, "40")));
        doThrow(new RuntimeException("fila inconsistente"))
                .doNothing()
                .when(notificationService).reconcileStockNotification(
                        any(), any(), any(), any(), any(), anyBoolean());

        job.reconcileStockNotifications();

        verify(notificationService, times(2)).reconcileStockNotification(
                any(), any(), any(), any(), any(), anyBoolean());
    }

    @Test
    void reconciliaTransferenciasYOrdenesAbiertasPidiendoResurgir() {
        when(transferRepository.findByStatusIn(any()))
                .thenReturn(List.of(new Transfer(), new Transfer()));
        when(purchaseOrderRepository.findByStatusIn(any()))
                .thenReturn(List.of(new PurchaseOrder()));

        job.reconcileWorkflowNotifications();

        verify(notificationService, times(2)).reconcileTransferNotification(any(Transfer.class), eq(true));
        verify(notificationService, times(1)).reconcilePurchaseOrderNotification(any(PurchaseOrder.class), eq(true));
    }

    @Test
    void alArrancarReconciliaTodoSinResurgirLasLeidas() {
        when(inventoryRepository.findAllWithProduct()).thenReturn(List.of(inventoryRow(1L, "5")));
        when(transferRepository.findByStatusIn(any())).thenReturn(List.of(new Transfer()));
        when(purchaseOrderRepository.findByStatusIn(any())).thenReturn(List.of(new PurchaseOrder()));

        job.reconcileOnStartup();

        verify(notificationService).reconcileStockNotification(
                any(), any(), any(), any(), any(), eq(false));
        verify(notificationService).reconcileTransferNotification(any(Transfer.class), eq(false));
        verify(notificationService).reconcilePurchaseOrderNotification(any(PurchaseOrder.class), eq(false));
    }

    @Test
    void unaEntidadQueFallaNoDetieneElBarridoDeFlujo() {
        when(transferRepository.findByStatusIn(any()))
                .thenReturn(List.of(new Transfer(), new Transfer()));
        when(purchaseOrderRepository.findByStatusIn(any()))
                .thenReturn(List.of(new PurchaseOrder()));
        doThrow(new RuntimeException("transferencia inconsistente"))
                .doNothing()
                .when(notificationService).reconcileTransferNotification(any(Transfer.class), anyBoolean());

        job.reconcileWorkflowNotifications();

        verify(notificationService, times(2)).reconcileTransferNotification(any(Transfer.class), anyBoolean());
        verify(notificationService, times(1)).reconcilePurchaseOrderNotification(any(PurchaseOrder.class), anyBoolean());
    }
}
