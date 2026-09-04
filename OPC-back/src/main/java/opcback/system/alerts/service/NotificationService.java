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

        return notifications.stream().map(NotificationResponse::from).toList();
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
            case TRANSFER_SHORTAGE -> throw new IllegalArgumentException(
                    "TRANSFER_SHORTAGE no es una notificación de nivel de stock");
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
