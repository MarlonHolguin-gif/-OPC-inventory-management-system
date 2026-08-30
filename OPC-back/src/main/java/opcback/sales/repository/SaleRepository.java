package opcback.sales.repository;

import opcback.sales.entity.Sale;
import opcback.sales.entity.SaleStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface SaleRepository extends JpaRepository<Sale, Long> {

    boolean existsBySaleNumber(String saleNumber);

    /**
     * Base para el dashboard (tendencia de ventas y comparativa entre
     * sucursales): branchId null = todas las sucursales, para reusar la
     * misma consulta en ambos casos y agrupar en Java (mismo patrón que
     * TransferService.complianceReport).
     */
    @Query("""
            select s from Sale s
            where (:branchId is null or s.branchId = :branchId)
              and s.status = :status
              and s.saleDate >= :from
              and s.saleDate <= :to
            """)
    List<Sale> findByOptionalBranchAndStatusAndDateRange(
            @Param("branchId") Long branchId,
            @Param("status") SaleStatus status,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);
}
