package opcback.purchases.repository;

import opcback.purchases.entity.PurchaseReceipt;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PurchaseReceiptRepository extends JpaRepository<PurchaseReceipt, Long> {
}
