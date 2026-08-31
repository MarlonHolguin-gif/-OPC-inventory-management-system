package opcback.inventory.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import opcback.inventory.dto.InventoryMovementRequest;
import opcback.inventory.dto.InventoryMovementResponse;
import opcback.inventory.dto.InventoryResponse;
import opcback.inventory.service.InventoryMovementService;
import opcback.inventory.service.InventoryService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * GET /sucursal/{id}: consulta de inventario de otra sucursal (solo
 * lectura) — sección 2.1 del PDF. Cualquier rol autenticado puede leer
 * cualquier sucursal, sin restricción.
 *
 * POST /movimientos: única puerta de entrada para modificar el stock —
 * ver InventoryMovementService. La restricción de escritura por sucursal
 * (BranchAccessService) se aplica ahí, no aquí.
 */
@RestController
@RequestMapping("/api/inventario")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryService inventoryService;
    private final InventoryMovementService inventoryMovementService;

    @GetMapping("/sucursal/{branchId}")
    public List<InventoryResponse> listByBranch(@PathVariable Long branchId) {
        return inventoryService.listByBranch(branchId);
    }

    /**
     * Vista "al vuelo" del estado de alerta actual (mismo InventoryAlertService
     * que usa listByBranch, solo filtrado a lo que no está NORMAL) — no
     * confundir con GET /api/notificaciones, que lista los cruces de
     * umbral ya persistidos en sy_notifications por
     * NotificationService.notifyStockThresholdCrossed().
     */
    @GetMapping("/sucursal/{branchId}/alertas")
    public List<InventoryResponse> listAlertsByBranch(@PathVariable Long branchId) {
        return inventoryService.listAlertsByBranch(branchId);
    }

    @PostMapping("/movimientos")
    public ResponseEntity<InventoryMovementResponse> registerMovement(
            @Valid @RequestBody InventoryMovementRequest request, Authentication authentication) {
        InventoryMovementResponse response = inventoryMovementService.register(request, authentication);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
