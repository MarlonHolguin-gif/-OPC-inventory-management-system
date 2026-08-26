package opcback.purchases.repository;

import opcback.purchases.entity.PurchaseReceiptItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;

public interface PurchaseReceiptItemRepository extends JpaRepository<PurchaseReceiptItem, Long> {

    /**
     * Cantidad ya recibida (sumada entre TODAS las recepciones anteriores)
     * para un ítem de orden específico — la base para validar que ninguna
     * recepción exceda lo pedido.
     */
    @Query("""
            select coalesce(sum(ri.receivedQuantity), 0) from PurchaseReceiptItem ri
            where ri.purchaseOrderItem.id = :purchaseOrderItemId
            """)
    BigDecimal sumReceivedByPurchaseOrderItemId(@Param("purchaseOrderItemId") Long purchaseOrderItemId);
}
