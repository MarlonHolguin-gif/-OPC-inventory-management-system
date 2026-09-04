package opcback.system.alerts.job;

import opcback.inventory.entity.Inventory;
import opcback.inventory.repository.InventoryRepository;
import opcback.products.entity.Product;
import opcback.system.alerts.service.NotificationService;
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
 * El chequeo programado recorre todo el inventario y delega la decisión en
 * NotificationService. Aquí solo se comprueba que llama una vez por fila,
 * con resurfaceRead = true, y que una fila que falla no aborta el barrido.
 */
@ExtendWith(MockitoExtension.class)
class NotificationReconciliationJobTest {

    @Mock
    private InventoryRepository inventoryRepository;
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
}
