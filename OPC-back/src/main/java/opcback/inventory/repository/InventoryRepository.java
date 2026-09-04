package opcback.inventory.repository;

import opcback.inventory.entity.Inventory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface InventoryRepository extends JpaRepository<Inventory, Long> {

    List<Inventory> findByBranchId(Long branchId);

    Optional<Inventory> findByBranchIdAndProductId(Long branchId, Long productId);

    /**
     * Todo el inventario con su producto ya cargado — lo recorre el chequeo
     * programado de notificaciones (NotificationReconciliationJob), que
     * necesita el SKU y el nombre fuera de la transacción de carga.
     */
    @Query("select i from Inventory i join fetch i.product")
    List<Inventory> findAllWithProduct();
}
