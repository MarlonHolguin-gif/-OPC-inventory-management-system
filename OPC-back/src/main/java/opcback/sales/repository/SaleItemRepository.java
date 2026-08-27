package opcback.sales.repository;

import opcback.sales.entity.SaleItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface SaleItemRepository extends JpaRepository<SaleItem, Long> {

    /**
     * Histórico de ventas por sucursal, producto, cliente y responsable,
     * filtrable por rango de fechas — todos los filtros son opcionales y
     * combinables (si un parámetro llega null, esa condición no se aplica).
     */
    @Query("""
            select i from SaleItem i
            join fetch i.sale s
            left join s.customer c
            join fetch i.product p
            where (:branchId is null or s.branchId = :branchId)
              and (:productId is null or p.id = :productId)
              and (:customerId is null or c.id = :customerId)
              and (:sellerId is null or s.sellerId = :sellerId)
              and (:from is null or s.saleDate >= :from)
              and (:to is null or s.saleDate <= :to)
            order by s.saleDate desc
            """)
    List<SaleItem> findHistory(
            @Param("branchId") Long branchId,
            @Param("productId") Long productId,
            @Param("customerId") Long customerId,
            @Param("sellerId") Long sellerId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);
}
