package opcback.transfers.repository;

import opcback.transfers.entity.Transfer;
import opcback.transfers.entity.TransferRoutePriority;
import opcback.transfers.entity.TransferStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface TransferRepository extends JpaRepository<Transfer, Long> {

    boolean existsByTransferNumber(String transferNumber);

    /**
     * Listado general (para ADMIN_GENERAL, que ve todas), con filtro opcional
     * por prioridad de ruta (si llega null, no se aplica esa condición —
     * mismo patrón que SaleItemRepository.findHistory).
     */
    @Query("""
            select t from Transfer t
            where (:routePriority is null or t.routePriority = :routePriority)
            order by t.requestDate desc
            """)
    List<Transfer> findAllFiltered(@Param("routePriority") TransferRoutePriority routePriority);

    /**
     * Listado acotado a las sucursales del usuario: solo las transferencias en
     * las que alguna de sus sucursales es el origen O el destino — una
     * sucursal que no participa no tiene nada que hacer con esa transferencia
     * y no debería verla.
     */
    @Query("""
            select t from Transfer t
            where (:routePriority is null or t.routePriority = :routePriority)
              and (t.originBranchId in :branchIds or t.destinationBranchId in :branchIds)
            order by t.requestDate desc
            """)
    List<Transfer> findForBranches(
            @Param("routePriority") TransferRoutePriority routePriority,
            @Param("branchIds") Collection<Long> branchIds);

    /**
     * Base del reporte de cumplimiento logístico: solo transferencias que ya
     * tienen tanto fecha estimada como fecha real de llegada (sin ambas no
     * hay nada que comparar), filtrable por rango de fecha_llegada_real —
     * es la fecha que el reporte mide, no la de solicitud.
     */
    @Query("""
            select t from Transfer t
            where t.actualArrivalDate is not null
              and t.estimatedArrivalDate is not null
              and (:from is null or t.actualArrivalDate >= :from)
              and (:to is null or t.actualArrivalDate <= :to)
            """)
    List<Transfer> findForComplianceReport(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    /**
     * Base del dashboard de transferencias activas: excluye los estados que
     * la tarjeta pide excluir explícitamente (FULLY_RECEIVED, CANCELLED),
     * involucrando la sucursal como origen O destino — branchId null =
     * todas (comparativa entre sucursales). Trae ítems + producto para
     * poder proyectar el impacto por producto sin N+1.
     */
    @Query("""
            select distinct t from Transfer t
            left join fetch t.items i
            left join fetch i.product p
            where t.status not in :excludedStatuses
              and (:branchId is null or t.originBranchId = :branchId or t.destinationBranchId = :branchId)
            """)
    List<Transfer> findActiveInvolvingBranch(
            @Param("branchId") Long branchId,
            @Param("excludedStatuses") Collection<TransferStatus> excludedStatuses);

    /**
     * Transferencias en un conjunto de estados — lo usa el chequeo
     * programado de notificaciones para reconciliar las que siguen
     * esperando una acción.
     */
    List<Transfer> findByStatusIn(Collection<TransferStatus> statuses);
}
