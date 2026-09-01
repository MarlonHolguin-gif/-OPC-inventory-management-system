package opcback.inventory.service;

import lombok.RequiredArgsConstructor;
import opcback.exception.ResourceNotFoundException;
import opcback.inventory.dto.InventoryResponse;
import opcback.inventory.dto.InventoryThresholdRequest;
import opcback.inventory.entity.AlertStatus;
import opcback.inventory.entity.Inventory;
import opcback.inventory.repository.InventoryRepository;
import opcback.products.entity.Product;
import opcback.products.repository.ProductRepository;
import opcback.security.BranchAccessService;
import opcback.system.alerts.service.NotificationService;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Consulta de inventario (sección 2.1 del PDF: "puede consultar el
 * inventario de cualquier otra sucursal", sin restricción de lectura) y
 * configuración de los umbrales de reabastecimiento (RF-05). El
 * current_quantity NO se toca aquí — esa es la única puerta de
 * InventoryMovementService.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InventoryService {

    private final InventoryRepository inventoryRepository;
    private final ProductRepository productRepository;
    private final BranchAccessService branchAccessService;
    private final InventoryAlertService inventoryAlertService;
    private final NotificationService notificationService;

    public List<InventoryResponse> listByBranch(Long branchId) {
        return inventoryRepository.findByBranchId(branchId).stream()
                .map(this::toResponse)
                .toList();
    }

    /**
     * Mismo listado, filtrado a solo los ítems en alerta — es lo que
     * consume el módulo de Alertas Inteligentes y el dashboard, reusando
     * exactamente InventoryAlertService.evaluate().
     */
    public List<InventoryResponse> listAlertsByBranch(Long branchId) {
        return inventoryRepository.findByBranchId(branchId).stream()
                .map(this::toResponse)
                .filter(response -> response.alertStatus() != AlertStatus.NORMAL)
                .toList();
    }

    /**
     * RF-05 — fija el stock mínimo y máximo de un producto en una sucursal.
     * Autorizado contra la sucursal (mismo criterio que registrar un
     * movimiento). Si el producto todavía no tiene fila de inventario en esa
     * sucursal, se crea en 0; así se puede configurar el umbral antes del
     * primer ingreso. Un `maxStock` de 0 = "sin tope máximo".
     *
     * Si al cambiar el umbral el stock actual pasa a estar en alerta (o deja
     * de estarlo), se dispara la misma notificación que un movimiento —
     * `notifyStockThresholdCrossed` con el estado de antes y de después,
     * reutilizando su criterio anti-duplicados.
     */
    @Transactional
    public InventoryResponse updateThresholds(
            Long branchId, Long productId, InventoryThresholdRequest request, Authentication authentication) {
        branchAccessService.assertCanWrite(authentication.getName(), branchId);

        if (request.maxStock().compareTo(BigDecimal.ZERO) > 0
                && request.maxStock().compareTo(request.minStock()) < 0) {
            throw new IllegalArgumentException("El stock máximo no puede ser menor que el mínimo.");
        }

        Inventory inventory = inventoryRepository.findByBranchIdAndProductId(branchId, productId)
                .orElseGet(() -> createEmptyInventory(branchId, productId));

        BigDecimal currentQuantity = inventory.getCurrentQuantity();
        AlertStatus before = inventoryAlertService.evaluate(
                currentQuantity, inventory.getMinStock(), inventory.getMaxStock());
        AlertStatus after = inventoryAlertService.evaluate(
                currentQuantity, request.minStock(), request.maxStock());

        inventory.setMinStock(request.minStock());
        inventory.setMaxStock(request.maxStock());
        inventory.setUpdatedAt(LocalDateTime.now());
        Inventory saved = inventoryRepository.save(inventory);

        notificationService.notifyStockThresholdCrossed(
                branchId, saved.getProduct(), before, after,
                currentQuantity, saved.getMinStock(), saved.getMaxStock());

        return toResponse(saved);
    }

    private Inventory createEmptyInventory(Long branchId, Long productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado: " + productId));

        Inventory inventory = new Inventory();
        inventory.setBranchId(branchId);
        inventory.setProduct(product);
        inventory.initializeQuantity(BigDecimal.ZERO);
        inventory.setMinStock(BigDecimal.ZERO);
        inventory.setMaxStock(BigDecimal.ZERO);
        inventory.setWeightedAvgCost(BigDecimal.ZERO);
        inventory.setUpdatedAt(LocalDateTime.now());
        return inventory;
    }

    private InventoryResponse toResponse(Inventory inventory) {
        AlertStatus status = inventoryAlertService.evaluate(
                inventory.getCurrentQuantity(), inventory.getMinStock(), inventory.getMaxStock());
        return InventoryResponse.from(inventory, status);
    }
}
