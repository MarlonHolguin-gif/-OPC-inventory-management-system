package opcback.purchases.repository;

import opcback.purchases.entity.PurchaseOrder;
import opcback.purchases.entity.PurchaseOrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Long> {

    boolean existsByOrderNumber(String orderNumber);

    /**
     * Órdenes de compra en un conjunto de estados — lo usa el chequeo
     * programado de notificaciones para reconciliar las que siguen
     * esperando una acción (enviar al proveedor o recibir mercancía).
     */
    List<PurchaseOrder> findByStatusIn(Collection<PurchaseOrderStatus> statuses);
}
