package opcback.system.alerts.repository;

import opcback.system.alerts.entity.Notification;
import opcback.system.alerts.entity.NotificationType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findAllByOrderByGeneratedAtDesc();

    List<Notification> findByBranchIdOrderByGeneratedAtDesc(Long branchId);

    List<Notification> findByBranchIdInOrderByGeneratedAtDesc(Collection<Long> branchIds);

    /**
     * Notificaciones de stock ya existentes para un producto en una
     * sucursal — la base de la reconciliación: se compara lo que hay contra
     * lo que debería haber (NotificationService.reconcileStockNotification).
     */
    List<Notification> findByProduct_IdAndBranchIdAndTypeIn(
            Long productId, Long branchId, Collection<NotificationType> types);

    /**
     * Borra las notificaciones de un tipo atadas a una entidad concreta —
     * hoy los TRANSFER_SHORTAGE de una transferencia, al tratar su faltante.
     */
    void deleteByTypeAndReferenceId(NotificationType type, Long referenceId);
}
