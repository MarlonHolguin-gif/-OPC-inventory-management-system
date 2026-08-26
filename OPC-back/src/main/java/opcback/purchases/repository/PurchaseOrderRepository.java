package opcback.purchases.repository;

import opcback.purchases.entity.PurchaseOrder;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Long> {

    boolean existsByOrderNumber(String orderNumber);
}
