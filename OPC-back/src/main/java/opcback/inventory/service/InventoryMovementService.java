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
 * DECIMAL(15,4), fila bloqueada, lo que sea), Spring hace rollback también
 * del INSERT en tr_inventory_movements — no puede quedar un movimiento
 * huérfano sin su efecto en el stock.
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

        InventoryMovement movement = new InventoryMovement();
        movement.setBranchId(request.branchId());
        movement.setProduct(product);
        movement.setMovementType(request.movementType());
        movement.setQuantity(request.quantity());
        movement.setUnitCost(request.unitCost() != null ? request.unitCost() : BigDecimal.ZERO);
        movement.setReason(request.reason());
        movement.setResponsibleUserId(responsibleUserId);
        movement.setReferenceType(request.referenceType() != null ? request.referenceType() : DEFAULT_REFERENCE_TYPE);
        movement.setReferenceId(request.referenceId() != null ? request.referenceId() : DEFAULT_REFERENCE_ID);
        movement.setMovementDate(request.movementDate() != null ? request.movementDate() : LocalDateTime.now());
        movement.setCreatedAt(LocalDateTime.now());

        InventoryMovement savedMovement = inventoryMovementRepository.save(movement);

        Inventory inventory = inventoryRepository.findByBranchIdAndProductId(request.branchId(), request.productId())
                .orElseGet(() -> createEmptyInventory(request.branchId(), product));

        BigDecimal signedQuantity = request.movementType().isInbound() ? request.quantity() : request.quantity().negate();
        inventory.applyMovement(signedQuantity);
        inventory.setUpdatedAt(LocalDateTime.now());
        Inventory savedInventory = inventoryRepository.save(inventory);

        return InventoryMovementResponse.from(savedMovement, savedInventory.getCurrentQuantity());
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
