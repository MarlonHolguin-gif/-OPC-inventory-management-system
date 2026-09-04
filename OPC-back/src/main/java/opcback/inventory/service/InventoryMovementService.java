package opcback.inventory.service;

import lombok.RequiredArgsConstructor;
import opcback.auth.entity.User;
import opcback.auth.repository.UserRepository;
import opcback.exception.ResourceNotFoundException;
import opcback.inventory.dto.InventoryMovementHistoryResponse;
import opcback.inventory.dto.InventoryMovementRequest;
import opcback.inventory.dto.InventoryMovementResponse;
import opcback.inventory.entity.Inventory;
import opcback.inventory.entity.InventoryMovement;
import opcback.inventory.entity.MovementType;
import opcback.inventory.repository.InventoryMovementRepository;
import opcback.inventory.repository.InventoryRepository;
import opcback.products.entity.Product;
import opcback.products.repository.ProductRepository;
import opcback.security.BranchAccessService;
import opcback.system.alerts.service.NotificationService;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.MathContext;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Única puerta de entrada para modificar tr_inventory.current_quantity.
 * Ningún otro service debe llamar a inventoryRepository.save(...) para
 * cambiar cantidad — Inventory.currentQuantity ni siquiera tiene un setter
 * público (ver Inventory.applyMovement), así que un intento de bypass no
 * compila con un setCurrentQuantity() directo.
 *
 * register() inserta el movimiento Y actualiza el inventario dentro de la
 * MISMA transacción: si el update de tr_inventory falla (ej. overflow de
 * DECIMAL(15,4), stock insuficiente, lo que sea), Spring hace rollback
 * también del INSERT en tr_inventory_movements — no puede quedar un
 * movimiento huérfano sin su efecto en el stock.
 */
@Service
@RequiredArgsConstructor
public class InventoryMovementService {

    private static final String DEFAULT_REFERENCE_TYPE = "MANUAL_ADJUSTMENT";
    private static final long DEFAULT_REFERENCE_ID = 0L;

    private final BranchAccessService branchAccessService;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final InventoryRepository inventoryRepository;
    private final InventoryMovementRepository inventoryMovementRepository;
    private final NotificationService notificationService;

    /**
     * Historial de movimientos (sección 3.1 del PDF): ADMIN_GENERAL ve los de
     * todas las sucursales; el gerente y el operador solo los de la(s)
     * sucursal(es) que tienen asignada(s) — mismo criterio de lectura por
     * sucursal que ya usan Transferencias y el listado de notificaciones.
     * Filtros opcionales combinables: sucursal (dentro de las que el usuario
     * puede ver), producto, tipo de movimiento y rango de fechas.
     */
    @Transactional(readOnly = true)
    public List<InventoryMovementHistoryResponse> history(Long branchId, Long productId, MovementType movementType,
            LocalDateTime from, LocalDateTime to, Authentication authentication) {
        List<Long> branchScope = resolveBranchScope(authentication.getName(), branchId);

        List<InventoryMovement> movements;
        if (branchScope == null) {
            movements = inventoryMovementRepository.findHistory(productId, movementType, from, to);
        } else if (branchScope.isEmpty()) {
            movements = List.of();
        } else {
            movements = inventoryMovementRepository.findHistoryForBranches(branchScope, productId, movementType, from, to);
        }

        // Nombre del responsable resuelto en bloque: /api/users es solo para
        // administradores, así que el frontend no puede resolverlo por su cuenta.
        Map<Long, String> responsibleNames = responsibleNamesById(
                movements.stream().map(InventoryMovement::getResponsibleUserId).collect(Collectors.toSet()));

        return movements.stream()
                .map(movement -> InventoryMovementHistoryResponse.from(
                        movement, responsibleNames.get(movement.getResponsibleUserId())))
                .toList();
    }

    /**
     * Resuelve el conjunto de sucursales que el usuario puede consultar,
     * cruzado con el filtro opcional de sucursal:
     *   null  -> sin restricción (ADMIN_GENERAL sin filtro: todas)
     *   []    -> ninguna (pidió una sucursal que no le corresponde)
     *   lista -> exactamente esas
     */
    private List<Long> resolveBranchScope(String email, Long branchFilter) {
        if (branchAccessService.isGeneralAdmin(email)) {
            return branchFilter != null ? List.of(branchFilter) : null;
        }
        List<Long> assigned = branchAccessService.getWritableBranchIds(email);
        if (branchFilter == null) {
            return assigned;
        }
        return assigned.contains(branchFilter) ? List.of(branchFilter) : List.of();
    }

    private Map<Long, String> responsibleNamesById(Set<Long> userIds) {
        if (userIds.isEmpty()) {
            return Map.of();
        }
        return userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, User::getName));
    }

    @Transactional
    public InventoryMovementResponse register(InventoryMovementRequest request, Authentication authentication) {
        String email = authentication.getName();
        branchAccessService.assertCanWrite(email, request.branchId());

        Product product = productRepository.findById(request.productId())
                .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado: " + request.productId()));

        Long responsibleUserId = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado: " + email))
                .getId();

        Inventory inventory = inventoryRepository.findByBranchIdAndProductId(request.branchId(), request.productId())
                .orElseGet(() -> createEmptyInventory(request.branchId(), product));

        BigDecimal unitCost = request.unitCost() != null ? request.unitCost() : BigDecimal.ZERO;

        if (request.movementType().isInbound()) {
            applyInbound(inventory, request.quantity(), unitCost);
        } else {
            applyOutbound(inventory, request.quantity());
        }
        inventory.setUpdatedAt(LocalDateTime.now());

        InventoryMovement movement = new InventoryMovement();
        movement.setBranchId(request.branchId());
        movement.setProduct(product);
        movement.setMovementType(request.movementType());
        movement.setQuantity(request.quantity());
        movement.setUnitCost(unitCost);
        movement.setReason(request.reason());
        movement.setResponsibleUserId(responsibleUserId);
        movement.setReferenceType(request.referenceType() != null ? request.referenceType() : DEFAULT_REFERENCE_TYPE);
        movement.setReferenceId(request.referenceId() != null ? request.referenceId() : DEFAULT_REFERENCE_ID);
        movement.setMovementDate(request.movementDate() != null ? request.movementDate() : LocalDateTime.now());
        movement.setCreatedAt(LocalDateTime.now());

        InventoryMovement savedMovement = inventoryMovementRepository.save(movement);
        Inventory savedInventory = inventoryRepository.save(inventory);

        // Sincroniza la notificación de stock con el nivel resultante: crea
        // la alerta si el movimiento dejó el stock bajo/alto/en cero, o la
        // borra si el movimiento lo devolvió a un nivel sano (card 1 +
        // "las cumplidas se borran al instante").
        notificationService.reconcileStockNotification(
                request.branchId(), product,
                savedInventory.getCurrentQuantity(), savedInventory.getMinStock(), savedInventory.getMaxStock());

        return InventoryMovementResponse.from(savedMovement, savedInventory.getCurrentQuantity());
    }

    /**
     * Costo promedio ponderado (sección 2.3 del análisis de requerimientos):
     * nuevo_costo = (stock_actual*costo_actual + cantidad*costo_unitario) /
     * (stock_actual + cantidad). Solo se recalcula si viene un costo real
     * (unitCost > 0) — un ingreso sin costo (ej. un ajuste positivo por
     * conteo físico) no debe diluir el costo promedio con un $0 falso.
     */
    private void applyInbound(Inventory inventory, BigDecimal quantity, BigDecimal unitCost) {
        if (unitCost.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal currentQuantity = inventory.getCurrentQuantity();
            BigDecimal currentCost = inventory.getWeightedAvgCost();
            BigDecimal totalValue = currentQuantity.multiply(currentCost).add(quantity.multiply(unitCost));
            BigDecimal newTotalQuantity = currentQuantity.add(quantity);
            inventory.setWeightedAvgCost(totalValue.divide(newTotalQuantity, new MathContext(10)));
        }
        inventory.applyMovement(quantity);
    }

    /**
     * Rechaza el retiro si no hay stock suficiente — no deja current_quantity
     * en negativo. Al lanzar antes de guardar nada, ni el movimiento ni el
     * update de inventario se persisten (misma transacción).
     */
    private void applyOutbound(Inventory inventory, BigDecimal quantity) {
        if (inventory.getCurrentQuantity().compareTo(quantity) < 0) {
            throw new IllegalStateException("Stock insuficiente: disponible " + formatQuantity(inventory.getCurrentQuantity())
                    + ", solicitado " + formatQuantity(quantity));
        }
        inventory.applyMovement(quantity.negate());
    }

    /**
     * tr_inventory.current_quantity es DECIMAL(15,4), así que un stock
     * entero como 85 llega desde la BD como "85.0000" — se le quitan los
     * ceros de más para que el mensaje de error sea legible.
     */
    private static String formatQuantity(BigDecimal value) {
        return value.stripTrailingZeros().toPlainString();
    }

    private Inventory createEmptyInventory(Long branchId, Product product) {
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
}
