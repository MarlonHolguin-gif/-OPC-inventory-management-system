package opcback.inventory.service;

import opcback.inventory.entity.AlertStatus;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

/**
 * Único criterio de evaluación de alerta por producto-sucursal — lo
 * consumen tanto la vista de inventario/dashboard (InventoryResponse)
 * como el futuro módulo de Alertas Inteligentes (hoy representado por
 * InventoryController.listAlertsByBranch). Es una función pura, sin
 * acceso a datos, para que sea trivial de reutilizar y de testear.
 */
@Service
public class InventoryAlertService {

    public AlertStatus evaluate(BigDecimal currentQuantity, BigDecimal minStock, BigDecimal maxStock) {
        if (currentQuantity.compareTo(minStock) < 0) {
            return AlertStatus.LOW_STOCK;
        }
        if (maxStock.compareTo(BigDecimal.ZERO) > 0 && currentQuantity.compareTo(maxStock) > 0) {
            return AlertStatus.HIGH_STOCK;
        }
        return AlertStatus.NORMAL;
    }
}
