package opcback.system.alerts.repository;

import opcback.system.alerts.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findAllByOrderByGeneratedAtDesc();

    List<Notification> findByBranchIdOrderByGeneratedAtDesc(Long branchId);

    List<Notification> findByBranchIdInOrderByGeneratedAtDesc(Collection<Long> branchIds);
}
