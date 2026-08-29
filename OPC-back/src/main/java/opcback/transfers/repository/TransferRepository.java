package opcback.transfers.repository;

import opcback.transfers.entity.Transfer;
import opcback.transfers.entity.TransferRoutePriority;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface TransferRepository extends JpaRepository<Transfer, Long> {

    boolean existsByTransferNumber(String transferNumber);

    /**
     * Listado general, con filtro opcional por prioridad de ruta (si llega
     * null, no se aplica esa condición — mismo patrón que
     * SaleItemRepository.findHistory).
     */
    @Query("""
            select t from Transfer t
            where (:routePriority is null or t.routePriority = :routePriority)
            order by t.requestDate desc
            """)
    List<Transfer> findAllFiltered(@Param("routePriority") TransferRoutePriority routePriority);

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
}
