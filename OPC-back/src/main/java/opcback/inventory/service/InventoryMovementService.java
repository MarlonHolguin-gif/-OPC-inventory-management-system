package opcback.inventory.service;

import lombok.RequiredArgsConstructor;
import opcback.auth.repository.UserRepository;
import opcback.exception.ResourceNotFoundException;
import opcback.inventory.dto.InventoryMovementRequest;
import opcback.inventory.dto.InventoryMovementResponse;
import opcback.inventory.entity.Inventory;
import opcback.inventory.entity.InventoryMovement;
import opcback.inventory.repository.InventoryMovementRepository;
import opcback.inventory.repository.InventoryRepository;
import opcback.products.entity.Product;
import opcback.products.repository.ProductRepository;
import opcback.security.BranchAccessService;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.MathContext;
import java.time.LocalDateTime;

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
            throw new IllegalStateException(
                    "Stock insuficiente: disponible " + inventory.getCurrentQuantity() + ", solicitado " + quantity);
        }
        inventory.applyMovement(quantity.negate());
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
