package opcback.system.alerts.job;

import lombok.RequiredArgsConstructor;
import opcback.inventory.entity.Inventory;
import opcback.inventory.repository.InventoryRepository;
import opcback.system.alerts.service.NotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Chequeo periódico de las notificaciones de stock. Recorre todo el
 * inventario y llama a NotificationService.reconcileStockNotification para
 * cada fila: crea las notificaciones que falten, borra las que ya se
 * cumplieron y vuelve a "sin leer" las que el usuario marcó leídas pero
 * cuyo problema sigue vigente (resurfaceRead = true) — así lo pendiente no
 * se olvida.
 *
 * Corre cada 2 horas entre las 7:00 y las 19:00, hora de Bogotá. El cron es
 * configurable con notifications.reconciliation.cron.
 *
 * El disparo instantáneo (cada movimiento, cambio de umbral y alta de
 * producto) mantiene las notificaciones al día en el momento; este trabajo
 * es la red de seguridad y el recordatorio recurrente.
 */
@Component
@RequiredArgsConstructor
public class NotificationReconciliationJob {

    private static final Logger log = LoggerFactory.getLogger(NotificationReconciliationJob.class);

    private final InventoryRepository inventoryRepository;
    private final NotificationService notificationService;

    @Scheduled(
            cron = "${notifications.reconciliation.cron:0 0 7,9,11,13,15,17,19 * * *}",
            zone = "America/Bogota")
    public void reconcileStockNotifications() {
        List<Inventory> inventories = inventoryRepository.findAllWithProduct();

        int reconciled = 0;
        int failed = 0;
        for (Inventory inventory : inventories) {
            try {
                // Cada fila en su propia transacción (dentro del service): un
                // producto con datos inconsistentes no aborta el barrido.
                notificationService.reconcileStockNotification(
                        inventory.getBranchId(), inventory.getProduct(),
                        inventory.getCurrentQuantity(), inventory.getMinStock(), inventory.getMaxStock(),
                        true);
                reconciled++;
            } catch (RuntimeException e) {
                failed++;
                log.warn("No se pudo reconciliar la notificación de stock del inventario {}: {}",
                        inventory.getId(), e.getMessage());
            }
        }

        log.info("Chequeo de notificaciones de stock: {} filas reconciliadas, {} con error", reconciled, failed);
    }
}
