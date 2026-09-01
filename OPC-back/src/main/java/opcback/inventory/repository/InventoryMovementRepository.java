package opcback.inventory.repository;

import opcback.inventory.entity.InventoryMovement;
import opcback.inventory.entity.MovementType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface InventoryMovementRepository extends JpaRepository<InventoryMovement, Long> {

    /**
     * Historial completo de movimientos (para ADMIN_GENERAL sin filtro de
     * sucursal), más reciente primero. Los demás filtros (producto, tipo,
     * rango de fechas) son opcionales y combinables — si un parámetro llega
     * null, esa condición no se aplica, igual que SaleItemRepository.findHistory.
     * `join fetch` del producto para mostrar SKU y nombre sin N+1.
     */
    @Query("""
            select m from InventoryMovement m
            join fetch m.product p
            where (:productId is null or p.id = :productId)
              and (:movementType is null or m.movementType = :movementType)
              and (:from is null or m.movementDate >= :from)
              and (:to is null or m.movementDate <= :to)
            order by m.movementDate desc
            """)
    List<InventoryMovement> findHistory(
            @Param("productId") Long productId,
            @Param("movementType") MovementType movementType,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);

    /**
     * Historial acotado a un conjunto de sucursales — el gerente y el
     * operador solo ven los movimientos de la(s) sucursal(es) que tienen
     * asignada(s) en ma_user_branch. Mismos filtros opcionales que arriba.
     */
    @Query("""
            select m from InventoryMovement m
            join fetch m.product p
            where m.branchId in :branchIds
              and (:productId is null or p.id = :productId)
              and (:movementType is null or m.movementType = :movementType)
              and (:from is null or m.movementDate >= :from)
              and (:to is null or m.movementDate <= :to)
            order by m.movementDate desc
            """)
    List<InventoryMovement> findHistoryForBranches(
            @Param("branchIds") Collection<Long> branchIds,
            @Param("productId") Long productId,
            @Param("movementType") MovementType movementType,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);

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
