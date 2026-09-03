package opcback.system.alerts.service;

import lombok.RequiredArgsConstructor;
import opcback.exception.ResourceNotFoundException;
import opcback.inventory.entity.AlertStatus;
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
import java.util.List;

/**
 * Épica de Alertas Inteligentes: evalúa cruces de umbral de stock (card 1,
 * llamada desde InventoryMovementService) y faltantes de transferencia
 * (card 3, llamada desde TransferService), y expone su lectura/marcado
 * (card 2, vía NotificationController). Es el único punto que escribe en
 * sy_notifications — igual que InventoryMovementService con
 * tr_inventory_movements, para no duplicar el criterio en varios lugares.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final BranchAccessService branchAccessService;

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
     * Card 1 — se llama en cada movimiento de inventario, con el estado de
     * alerta de ANTES y de DESPUÉS de aplicarlo. Solo genera notificación
     * si el estado realmente cambió hacia LOW_STOCK/HIGH_STOCK (un cruce
     * real) — si ya estaba en ese estado (before == after), no hay nada
     * nuevo que avisar, que es exactamente el criterio de "no duplicadas
     * mientras la condición no cambie": no hace falta una columna extra ni
     * consultar notificaciones previas, el propio antes/después de esta
     * llamada ya lo garantiza.
     */
    @Transactional
    public void notifyStockThresholdCrossed(
            Long branchId, Product product, AlertStatus before, AlertStatus after,
            BigDecimal currentQuantity, BigDecimal minStock, BigDecimal maxStock) {
        if (after == before || after == AlertStatus.NORMAL) {
            return;
        }

        NotificationType type = after == AlertStatus.LOW_STOCK ? NotificationType.LOW_STOCK : NotificationType.HIGH_STOCK;
        String etiqueta = type == NotificationType.LOW_STOCK ? "Stock bajo" : "Stock alto";
        BigDecimal threshold = type == NotificationType.LOW_STOCK ? minStock : maxStock;
        String message = "%s: %s — %s (actual %s, %s %s)".formatted(
                etiqueta, product.getSku(), product.getName(), formatQuantity(currentQuantity),
                type == NotificationType.LOW_STOCK ? "mínimo" : "máximo", formatQuantity(threshold));

        save(type, branchId, product, message);
    }

    /**
     * Card 3 — se llama por cada ítem con diferencia > 0 en una recepción
     * parcial. El esquema de sy_notifications no tiene una columna propia
     * para "transferencia relacionada" (a diferencia de
     * tr_inventory_movements, que sí tiene reference_type/reference_id) —
     * el criterio de aceptación ("incluye producto, cantidad faltante y
     * transferencia relacionada") se cumple incluyendo el número de
     * transferencia en el mensaje; product_id ya queda como columna propia.
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

        save(NotificationType.TRANSFER_SHORTAGE, transfer.getDestinationBranchId(), item.getProduct(), message);
    }

    /**
     * Se llama al crear un producto, una vez por cada sucursal activa que
     * quede sin existencias de él (sin fila en tr_inventory). Sirve para que
     * el gerente/administrador de cada sucursal vea qué productos hay sin
     * stock — no hay alerta de "stock bajo" en este caso porque con
     * min_stock en 0 la regla de umbral da NORMAL.
     */
    @Transactional
    public void notifyProductWithoutStock(Product product, List<Long> branchIds) {
        String message = "Producto sin existencias: %s — %s".formatted(product.getSku(), product.getName());
        for (Long branchId : branchIds) {
            save(NotificationType.OUT_OF_STOCK, branchId, product, message);
        }
    }

    private void save(NotificationType type, Long branchId, Product product, String message) {
        Notification notification = new Notification();
        notification.setType(type);
        notification.setBranchId(branchId);
        notification.setProduct(product);
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
