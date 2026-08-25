package opcback.inventory.repository;

import opcback.inventory.entity.Inventory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface InventoryRepository extends JpaRepository<Inventory, Long> {

    List<Inventory> findByBranchId(Long branchId);

    Optional<Inventory> findByBranchIdAndProductId(Long branchId, Long productId);
}
