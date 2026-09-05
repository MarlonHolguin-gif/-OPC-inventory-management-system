package opcback.system.alerts.service;

import lombok.RequiredArgsConstructor;
import opcback.exception.ResourceNotFoundException;
import opcback.inventory.entity.AlertStatus;
import opcback.inventory.service.InventoryAlertService;
import opcback.products.entity.Product;
import opcback.security.BranchAccessService;
import opcback.system.alerts.dto.NotificationResponse;
import opcback.system.alerts.entity.Notification;
import opcback.system.alerts.entity.NotificationChannel;
import opcback.system.alerts.entity.NotificationStatus;
import opcback.system.alerts.entity.NotificationType;
import opcback.system.alerts.repository.NotificationRepository;
import opcback.purchases.entity.PurchaseOrder;
import opcback.transfers.entity.Transfer;
import opcback.transfers.entity.TransferItem;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

/**
 * Épica de Alertas Inteligentes. Es el único punto que escribe en
 * sy_notifications — igual que InventoryMovementService con
 * tr_inventory_movements, para no duplicar el criterio en varios lugares.
 *
 * Modelo: sy_notifications refleja el ESTADO PENDIENTE ACTUAL, no un
 * histórico de eventos. Una sola función (reconcileStockNotification) decide
 * qué notificación de stock debe existir para un producto en una sucursal —
 * crea la que falte, reemplaza si cambió de tipo y borra la que ya se
 * cumplió. La llaman con el mismo criterio:
 *   - el disparo instantáneo: cada movimiento de inventario, cada cambio de
 *     umbral y el alta de un producto (ver InventoryMovementService,
 *     InventoryService, ProductService);
 *   - el chequeo programado: NotificationReconciliationJob, cada 2 horas
 *     entre las 7:00 y las 19:00.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NotificationService {

    /** Tipos que dependen del nivel de stock de un producto en una sucursal. */
    private static final Set<NotificationType> STOCK_TYPES =
            EnumSet.of(NotificationType.LOW_STOCK, NotificationType.HIGH_STOCK, NotificationType.OUT_OF_STOCK);

    /**
     * Tipos de flujo de trabajo que solo ve quien gestiona la sucursal
     * (gerente o administrador general) — el operador de inventario, no.
     */
    private static final Set<NotificationType> WORKFLOW_PENDING_TYPES =
            EnumSet.of(NotificationType.TRANSFER_PENDING, NotificationType.PURCHASE_ORDER_PENDING);

    private final NotificationRepository notificationRepository;
    private final BranchAccessService branchAccessService;
    private final InventoryAlertService inventoryAlertService;

    /**
     * Card 2 — "un usuario solo ve notificaciones de sus sucursales
     * asignadas (o todas si es ADMIN_GENERAL)". branchId es un filtro
     * adicional opcional dentro de lo que el usuario ya puede ver — si no
     * es admin y pide una sucursal que no tiene asignada, se rechaza en
     * vez de devolver una lista vacía silenciosa.
     */
    public List<NotificationResponse> list(String email, Long branchId) {
        boolean isAdmin = branchAccessService.isGeneralAdmin(email);

        List<Notification> notifications;
        if (isAdmin) {
            notifications = branchId != null
                    ? notificationRepository.findByBranchIdOrderByGeneratedAtDesc(branchId)
                    : notificationRepository.findAllByOrderByGeneratedAtDesc();
        } else {
            List<Long> ownBranchIds = branchAccessService.getWritableBranchIds(email);
            if (branchId != null) {
                if (!ownBranchIds.contains(branchId)) {
                    throw new AccessDeniedException("No tiene acceso a las notificaciones de la sucursal " + branchId);
                }
                notifications = notificationRepository.findByBranchIdOrderByGeneratedAtDesc(branchId);
            } else {
                notifications = notificationRepository.findByBranchIdInOrderByGeneratedAtDesc(ownBranchIds);
            }
        }

        // Las notificaciones de flujo de trabajo (transferencias / órdenes de
        // compra pendientes) solo las ve quien gestiona la sucursal.
        boolean showWorkflow = isAdmin || branchAccessService.isBranchManager(email);
        return notifications.stream()
                .filter(notification -> showWorkflow || !WORKFLOW_PENDING_TYPES.contains(notification.getType()))
                .map(NotificationResponse::from)
                .toList();
    }

    /**
     * Card 2 — PATCH marcar como leída. Mismo criterio de acceso que
     * list(): una sucursal ajena (para un no-admin) es 403, no 404, para
     * no revelar por descarte si la notificación existe.
     */
    @Transactional
    public NotificationResponse markAsRead(Long id, String email) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notificación no encontrada: " + id));

        boolean isAdmin = branchAccessService.isGeneralAdmin(email);
        if (!isAdmin && !branchAccessService.getWritableBranchIds(email).contains(notification.getBranchId())) {
            throw new AccessDeniedException("No tiene acceso a esta notificación");
        }
        if (WORKFLOW_PENDING_TYPES.contains(notification.getType())
                && !isAdmin && !branchAccessService.isBranchManager(email)) {
            throw new AccessDeniedException("No tiene acceso a esta notificación");
        }

        if (notification.getStatus() != NotificationStatus.READ) {
            notification.setStatus(NotificationStatus.READ);
            notification.setReadAt(LocalDateTime.now());
            notification = notificationRepository.save(notification);
        }

        return NotificationResponse.from(notification);
    }

    /**
     * Sincroniza la notificación de stock de un producto en una sucursal
     * con su estado real. Variante sin resurgir: la usan los disparos
     * instantáneos, que no vuelven a molestar con algo ya visto.
     */
    @Transactional
    public void reconcileStockNotification(Long branchId, Product product,
            BigDecimal currentQuantity, BigDecimal minStock, BigDecimal maxStock) {
        reconcileStockNotification(branchId, product, currentQuantity, minStock, maxStock, false);
    }

    /**
     * Sincroniza la notificación de stock de un producto en una sucursal
     * con su estado real:
     *   - si el stock está sano, borra cualquier notificación de stock que
     *     hubiera (la condición se cumplió);
     *   - si no, se asegura de que exista exactamente una del tipo correcto
     *     (LOW_STOCK / HIGH_STOCK / OUT_OF_STOCK), reemplazando una de otro
     *     tipo si el nivel cambió de categoría.
     *
     * @param resurfaceRead solo el chequeo programado lo pasa en true: si la
     *   notificación vigente estaba marcada como leída pero el problema
     *   sigue, vuelve a PENDING y sube al tope para que no se olvide. Las
     *   que aún están sin leer no se tocan.
     */
    @Transactional
    public void reconcileStockNotification(Long branchId, Product product,
            BigDecimal currentQuantity, BigDecimal minStock, BigDecimal maxStock, boolean resurfaceRead) {
        NotificationType desired = desiredStockType(currentQuantity, minStock, maxStock);
        List<Notification> existing = notificationRepository
                .findByProduct_IdAndBranchIdAndTypeIn(product.getId(), branchId, STOCK_TYPES);

        if (desired == null) {
            notificationRepository.deleteAll(existing);
            return;
        }

        Notification current = null;
        List<Notification> stale = new ArrayList<>();
        for (Notification notification : existing) {
            if (current == null && notification.getType() == desired) {
                current = notification;
            } else {
                stale.add(notification);
            }
        }
        notificationRepository.deleteAll(stale);

        String message = stockMessage(desired, product, currentQuantity, minStock, maxStock);
        if (current == null) {
            save(desired, branchId, product, null, message);
            return;
        }

        current.setMessage(message);
        if (resurfaceRead && current.getStatus() == NotificationStatus.READ) {
            current.setStatus(NotificationStatus.PENDING);
            current.setReadAt(null);
            current.setGeneratedAt(LocalDateTime.now());
        }
        notificationRepository.save(current);
    }

    /**
     * Se llama al crear un producto, una vez por cada sucursal activa que
     * quede sin existencias de él (sin fila en tr_inventory). Pasa por la
     * misma reconciliación (stock 0 -> OUT_OF_STOCK) para no duplicar
     * criterio ni crear una notificación repetida si ya la hubiera.
     */
    @Transactional
    public void notifyProductWithoutStock(Product product, List<Long> branchIds) {
        for (Long branchId : branchIds) {
            reconcileStockNotification(branchId, product, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);
        }
    }

    /**
     * Card 3 — se llama por cada ítem con diferencia > 0 en una recepción
     * parcial. reference_id guarda el id de la transferencia (el número va
     * en el texto, para leerlo) para poder borrar estas notificaciones al
     * tratar el faltante y para enlazar el clic de la campana al detalle.
     */
    @Transactional
    public void notifyTransferShortage(Transfer transfer, TransferItem item) {
        BigDecimal difference = item.getDifference();
        if (difference == null || difference.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }

        String message = "Faltante en transferencia %s: %s — %s, faltan %s unidades".formatted(
                transfer.getTransferNumber(), item.getProduct().getSku(), item.getProduct().getName(),
                formatQuantity(difference));

        save(NotificationType.TRANSFER_SHORTAGE, transfer.getDestinationBranchId(),
                item.getProduct(), transfer.getId(), message);
    }

    /**
     * Card 5 (cierre del faltante): al registrar el tratamiento de un
     * faltante de transferencia, sus notificaciones dejan de tener sentido
     * — se borran al instante (ver TransferService.resolveShortage).
     */
    @Transactional
    public void clearTransferShortage(Long transferId) {
        notificationRepository.deleteByTypeAndReferenceId(NotificationType.TRANSFER_SHORTAGE, transferId);
    }

    // ---- Notificaciones de flujo de trabajo (transferencias / órdenes) ----

    /**
     * Sincroniza la notificación de flujo de una transferencia con su estado
     * actual: la crea/actualiza mientras espera una acción y la borra al
     * cerrarse. Cada estado apunta a la sucursal que tiene que actuar:
     *   - SOLICITADA / EN_PREPARACION -> sucursal de origen (prepara y despacha);
     *   - EN_TRANSITO -> sucursal de destino (recibe);
     *   - RECIBIDA_PARCIAL sin tratar -> sucursal de destino (trata el faltante);
     *   - RECIBIDA_COMPLETA / CANCELADA / faltante ya tratado -> se borra.
     * La llaman TransferService tras cada transición y el chequeo programado.
     */
    @Transactional
    public void reconcileTransferNotification(Transfer transfer) {
        reconcileTransferNotification(transfer, false);
    }

    @Transactional
    public void reconcileTransferNotification(Transfer transfer, boolean resurfaceRead) {
        WorkflowTarget target = transferTarget(transfer);
        reconcileWorkflowNotification(NotificationType.TRANSFER_PENDING, transfer.getId(), target, resurfaceRead);
    }

    /**
     * Sincroniza la notificación de flujo de una orden de compra con su
     * estado: BORRADOR -> "pendiente por enviar al proveedor"; ENVIADA /
     * RECIBIDA_PARCIAL -> "pendiente por recepción"; RECIBIDA_COMPLETA /
     * CANCELADA -> se borra. Siempre apunta a la sucursal de la orden.
     */
    @Transactional
    public void reconcilePurchaseOrderNotification(PurchaseOrder order) {
        reconcilePurchaseOrderNotification(order, false);
    }

    @Transactional
    public void reconcilePurchaseOrderNotification(PurchaseOrder order, boolean resurfaceRead) {
        WorkflowTarget target = purchaseOrderTarget(order);
        reconcileWorkflowNotification(NotificationType.PURCHASE_ORDER_PENDING, order.getId(), target, resurfaceRead);
    }

    /** Sucursal a notificar + texto, o null si la entidad ya no espera acción. */
    private record WorkflowTarget(Long branchId, String message) {
    }

    private WorkflowTarget transferTarget(Transfer transfer) {
        String number = transfer.getTransferNumber();
        return switch (transfer.getStatus()) {
            case REQUESTED -> new WorkflowTarget(transfer.getOriginBranchId(),
                    "Transferencia " + number + " esperando preparación en la sucursal de origen");
            case IN_PREPARATION -> new WorkflowTarget(transfer.getOriginBranchId(),
                    "Transferencia " + number + " lista para despachar");
            case IN_TRANSIT -> new WorkflowTarget(transfer.getDestinationBranchId(),
                    "Transferencia " + number + " en tránsito, pendiente de recepción");
            case PARTIALLY_RECEIVED -> transfer.getShortageResolution() == null
                    ? new WorkflowTarget(transfer.getDestinationBranchId(),
                        "Transferencia " + number + " con faltante pendiente de tratamiento (reenvío, reclamación o ajuste)")
                    : null;
            case FULLY_RECEIVED, CANCELLED -> null;
        };
    }

    private WorkflowTarget purchaseOrderTarget(PurchaseOrder order) {
        String number = order.getOrderNumber();
        return switch (order.getStatus()) {
            case DRAFT -> new WorkflowTarget(order.getBranchId(),
                    "Orden de compra " + number + " pendiente por enviar al proveedor");
            case SENT -> new WorkflowTarget(order.getBranchId(),
                    "Orden de compra " + number + " pendiente por recepción");
            case PARTIALLY_RECEIVED -> new WorkflowTarget(order.getBranchId(),
                    "Orden de compra " + number + " recibida en parte, aún falta mercancía por recibir");
            case FULLY_RECEIVED, CANCELLED -> null;
        };
    }

    /**
     * Reconciliación común de las notificaciones de flujo, identificadas por
     * (tipo, reference_id): crea la que falte, actualiza sucursal y texto si
     * cambió el estado, y borra cuando ya no hay nada que hacer. Con
     * resurfaceRead=true (chequeo programado) una notificación leída que
     * sigue pendiente vuelve a PENDING y sube al tope.
     */
    private void reconcileWorkflowNotification(
            NotificationType type, Long referenceId, WorkflowTarget target, boolean resurfaceRead) {
        List<Notification> existing = notificationRepository.findByTypeAndReferenceId(type, referenceId);

        if (target == null) {
            notificationRepository.deleteAll(existing);
            return;
        }

        Notification current = existing.isEmpty() ? null : existing.get(0);
        if (existing.size() > 1) {
            notificationRepository.deleteAll(existing.subList(1, existing.size()));
        }

        if (current == null) {
            save(type, target.branchId(), null, referenceId, target.message());
            return;
        }

        current.setBranchId(target.branchId());
        current.setMessage(target.message());
        if (resurfaceRead && current.getStatus() == NotificationStatus.READ) {
            current.setStatus(NotificationStatus.PENDING);
            current.setReadAt(null);
            current.setGeneratedAt(LocalDateTime.now());
        }
        notificationRepository.save(current);
    }

    /**
     * Tipo de notificación de stock que debería existir hoy para una fila
     * de inventario, o null si el nivel está sano. Criterio único que
     * comparten el disparo instantáneo y el chequeo programado.
     *
     * OUT_OF_STOCK gana a LOW_STOCK cuando la cantidad es cero: es la
     * situación más grave y no tiene sentido mostrar las dos. Con
     * min_stock en 0, InventoryAlertService da NORMAL para stock 0 (0 no es
     * "< 0"), así que el caso "sin existencias" se resuelve aquí antes de
     * consultar el umbral.
     */
    private NotificationType desiredStockType(BigDecimal currentQuantity, BigDecimal minStock, BigDecimal maxStock) {
        if (currentQuantity.signum() <= 0) {
            return NotificationType.OUT_OF_STOCK;
        }
        AlertStatus status = inventoryAlertService.evaluate(currentQuantity, minStock, maxStock);
        return switch (status) {
            case LOW_STOCK -> NotificationType.LOW_STOCK;
            case HIGH_STOCK -> NotificationType.HIGH_STOCK;
            case NORMAL -> null;
        };
    }

    private String stockMessage(NotificationType type, Product product,
            BigDecimal currentQuantity, BigDecimal minStock, BigDecimal maxStock) {
        return switch (type) {
            case OUT_OF_STOCK -> "Sin existencias: %s — %s".formatted(product.getSku(), product.getName());
            case LOW_STOCK -> "Stock bajo: %s — %s (actual %s, mínimo %s)".formatted(
                    product.getSku(), product.getName(), formatQuantity(currentQuantity), formatQuantity(minStock));
            case HIGH_STOCK -> "Stock alto: %s — %s (actual %s, máximo %s)".formatted(
                    product.getSku(), product.getName(), formatQuantity(currentQuantity), formatQuantity(maxStock));
            case TRANSFER_SHORTAGE, TRANSFER_PENDING, PURCHASE_ORDER_PENDING -> throw new IllegalArgumentException(
                    type + " no es una notificación de nivel de stock");
        };
    }

    private void save(NotificationType type, Long branchId, Product product, Long referenceId, String message) {
        Notification notification = new Notification();
        notification.setType(type);
        notification.setBranchId(branchId);
        notification.setProduct(product);
        notification.setReferenceId(referenceId);
        notification.setMessage(message);
        notification.setChannel(NotificationChannel.IN_APP);
        notification.setStatus(NotificationStatus.PENDING);
        notification.setGeneratedAt(LocalDateTime.now());
        notificationRepository.save(notification);
    }

    private static String formatQuantity(BigDecimal value) {
        return value.stripTrailingZeros().toPlainString();
    }
}
