package opcback.inventory.repository;

import opcback.inventory.entity.InventoryMovement;
import opcback.inventory.entity.MovementType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface InventoryMovementRepository extends JpaRepository<InventoryMovement, Long> {

    /**
     * Base para el dashboard de rotación de inventario — branchId null =
     * todas las sucursales (comparativa), from/to null = sin límite de
     * ese lado del rango.
     */
    @Query("""
            select m from InventoryMovement m
            join fetch m.product p
            where (:branchId is null or m.branchId = :branchId)
              and m.movementType = :movementType
              and (:from is null or m.movementDate >= :from)
              and (:to is null or m.movementDate <= :to)
            """)
    List<InventoryMovement> findByOptionalBranchAndTypeAndDateRange(
            @Param("branchId") Long branchId,
            @Param("movementType") MovementType movementType,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);
}
