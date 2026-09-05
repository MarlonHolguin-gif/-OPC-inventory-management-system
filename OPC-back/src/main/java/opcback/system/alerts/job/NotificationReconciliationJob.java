package opcback.system.alerts.job;

import lombok.RequiredArgsConstructor;
import opcback.inventory.entity.Inventory;
import opcback.inventory.repository.InventoryRepository;
import opcback.purchases.entity.PurchaseOrder;
import opcback.purchases.entity.PurchaseOrderStatus;
import opcback.purchases.repository.PurchaseOrderRepository;
import opcback.system.alerts.service.NotificationService;
import opcback.transfers.entity.Transfer;
import opcback.transfers.entity.TransferStatus;
import opcback.transfers.repository.TransferRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.EnumSet;
import java.util.List;

/**
 * Chequeo de las notificaciones. Recorre el estado actual del sistema y
 * llama a la reconciliación correspondiente para cada fila: crea las
 * notificaciones que falten y borra las que ya se cumplieron.
 *
 * Cubre tres frentes, cada uno aislado para que un fallo no afecte a los demás:
 *   - stock: cada fila de inventario (LOW_STOCK / HIGH_STOCK / OUT_OF_STOCK);
 *   - transferencias que siguen esperando una acción (TRANSFER_PENDING);
 *   - órdenes de compra que siguen esperando una acción (PURCHASE_ORDER_PENDING).
 *
 * Se dispara:
 *   - al arrancar (ApplicationReadyEvent) — sin resurgir: solo pone al día lo
 *     que falte, para que tras un despliegue o un restore de la BD no haya que
 *     esperar al cron;
 *   - cada 2 horas entre las 7:00 y las 19:00, hora de Bogotá (cron
 *     configurable con notifications.reconciliation.cron) — con resurgir: una
 *     notificación leída cuyo motivo sigue vigente vuelve a "sin leer" y sube
 *     al tope, para que lo pendiente no se olvide.
 *
 * El disparo instantáneo (cada movimiento / transición de estado) mantiene
 * las notificaciones al día en el momento; este trabajo es la red de
 * seguridad y el recordatorio recurrente.
 */
@Component
@RequiredArgsConstructor
public class NotificationReconciliationJob {

    private static final Logger log = LoggerFactory.getLogger(NotificationReconciliationJob.class);

    private static final String CRON = "${notifications.reconciliation.cron:0 0 7,9,11,13,15,17,19 * * *}";
    private static final String ZONE = "America/Bogota";

    /** Estados de transferencia que todavía esperan una acción de alguien. */
    private static final EnumSet<TransferStatus> OPEN_TRANSFER_STATUSES = EnumSet.of(
            TransferStatus.REQUESTED, TransferStatus.IN_PREPARATION,
            TransferStatus.IN_TRANSIT, TransferStatus.PARTIALLY_RECEIVED);

    /** Estados de orden de compra que todavía esperan una acción. */
    private static final EnumSet<PurchaseOrderStatus> OPEN_ORDER_STATUSES = EnumSet.of(
            PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.SENT, PurchaseOrderStatus.PARTIALLY_RECEIVED);

    private final InventoryRepository inventoryRepository;
    private final TransferRepository transferRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final NotificationService notificationService;

    /**
     * Reconciliación al arrancar: sin esto, tras un despliegue (o un restore
     * de la BD) las notificaciones de lo que ya estaba pendiente no
     * aparecerían hasta el siguiente tick del cron. Sin resurgir — no
     * reabre lo que el usuario ya marcó como leído solo por reiniciar.
     */
    @EventListener(ApplicationReadyEvent.class)
    public void reconcileOnStartup() {
        log.info("Reconciliación inicial de notificaciones al arrancar");
        reconcileStock(false);
        reconcileWorkflow(false);
    }

    @Scheduled(cron = CRON, zone = ZONE)
    public void reconcileStockNotifications() {
        reconcileStock(true);
    }

    @Scheduled(cron = CRON, zone = ZONE)
    public void reconcileWorkflowNotifications() {
        reconcileWorkflow(true);
    }

    private void reconcileStock(boolean resurfaceRead) {
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
                        resurfaceRead);
                reconciled++;
            } catch (RuntimeException e) {
                failed++;
                log.warn("No se pudo reconciliar la notificación de stock del inventario {}: {}",
                        inventory.getId(), e.getMessage());
            }
        }

        log.info("Chequeo de notificaciones de stock: {} filas reconciliadas, {} con error", reconciled, failed);
    }

    private void reconcileWorkflow(boolean resurfaceRead) {
        int reconciled = 0;
        int failed = 0;

        for (Transfer transfer : transferRepository.findByStatusIn(OPEN_TRANSFER_STATUSES)) {
            try {
                notificationService.reconcileTransferNotification(transfer, resurfaceRead);
                reconciled++;
            } catch (RuntimeException e) {
                failed++;
                log.warn("No se pudo reconciliar la notificación de la transferencia {}: {}",
                        transfer.getId(), e.getMessage());
            }
        }

        for (PurchaseOrder order : purchaseOrderRepository.findByStatusIn(OPEN_ORDER_STATUSES)) {
            try {
                notificationService.reconcilePurchaseOrderNotification(order, resurfaceRead);
                reconciled++;
            } catch (RuntimeException e) {
                failed++;
                log.warn("No se pudo reconciliar la notificación de la orden de compra {}: {}",
                        order.getId(), e.getMessage());
            }
        }

        log.info("Chequeo de notificaciones de flujo: {} reconciliadas, {} con error", reconciled, failed);
    }
}
