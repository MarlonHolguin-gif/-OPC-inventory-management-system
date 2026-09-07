package opcback.purchases.repository;

import opcback.purchases.entity.PurchaseOrderItem;
import opcback.purchases.entity.PurchaseOrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface PurchaseOrderItemRepository extends JpaRepository<PurchaseOrderItem, Long> {

    /**
     * Histórico de compras por proveedor, producto y/o estado, filtrable por
     * rango de fechas — todos los filtros son opcionales y combinables (si un
     * parámetro llega null, esa condición no se aplica).
     */
    @Query("""
            select i from PurchaseOrderItem i
            join fetch i.purchaseOrder o
            join fetch o.supplier s
            join fetch i.product p
            where (:supplierId is null or s.id = :supplierId)
              and (:productId is null or p.id = :productId)
              and (:status is null or o.status = :status)
              and (:from is null or o.orderDate >= :from)
              and (:to is null or o.orderDate <= :to)
            order by o.orderDate desc
            """)
    List<PurchaseOrderItem> findHistory(
            @Param("supplierId") Long supplierId,
            @Param("productId") Long productId,
            @Param("status") PurchaseOrderStatus status,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);
}
