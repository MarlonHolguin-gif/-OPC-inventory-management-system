package opcback.purchases.repository;

import opcback.purchases.entity.PurchaseOrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface PurchaseOrderItemRepository extends JpaRepository<PurchaseOrderItem, Long> {

    /**
     * Histórico de compras por proveedor y/o producto, filtrable por rango
     * de fechas — todos los filtros son opcionales y combinables (si un
     * parámetro llega null, esa condición no se aplica).
     */
    @Query("""
            select i from PurchaseOrderItem i
            join fetch i.purchaseOrder o
            join fetch o.supplier s
            join fetch i.product p
            where (:supplierId is null or s.id = :supplierId)
              and (:productId is null or p.id = :productId)
              and (:from is null or o.orderDate >= :from)
              and (:to is null or o.orderDate <= :to)
            order by o.orderDate desc
            """)
    List<PurchaseOrderItem> findHistory(
            @Param("supplierId") Long supplierId,
            @Param("productId") Long productId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);
}
