package opcback.inventory.service;

import lombok.RequiredArgsConstructor;
import opcback.inventory.dto.InventoryResponse;
import opcback.inventory.entity.AlertStatus;
import opcback.inventory.entity.Inventory;
import opcback.inventory.repository.InventoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Solo lectura — sección 2.1 del PDF: "puede consultar el inventario de
 * cualquier otra sucursal", sin restricción de acceso. La escritura vive
 * en InventoryMovementService, la única puerta de entrada a current_quantity.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InventoryService {

    private final InventoryRepository inventoryRepository;
    private final InventoryAlertService inventoryAlertService;

    public List<InventoryResponse> listByBranch(Long branchId) {
        return inventoryRepository.findByBranchId(branchId).stream()
                .map(this::toResponse)
                .toList();
    }

    /**
     * Mismo listado, filtrado a solo los ítems en alerta — representa lo
     * que consumiría el módulo de Alertas Inteligentes (todavía no
     * implementado), reusando exactamente InventoryAlertService.evaluate().
     */
    public List<InventoryResponse> listAlertsByBranch(Long branchId) {
        return inventoryRepository.findByBranchId(branchId).stream()
                .map(this::toResponse)
                .filter(response -> response.alertStatus() != AlertStatus.NORMAL)
                .toList();
    }

    private InventoryResponse toResponse(Inventory inventory) {
        AlertStatus status = inventoryAlertService.evaluate(
                inventory.getCurrentQuantity(), inventory.getMinStock(), inventory.getMaxStock());
        return InventoryResponse.from(inventory, status);
    }
}
