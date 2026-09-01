package opcback.inventory.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import opcback.inventory.dto.InventoryMovementHistoryResponse;
import opcback.inventory.dto.InventoryMovementRequest;
import opcback.inventory.dto.InventoryMovementResponse;
import opcback.inventory.dto.InventoryResponse;
import opcback.inventory.dto.InventoryThresholdRequest;
import opcback.inventory.entity.MovementType;
import opcback.inventory.service.InventoryMovementService;
import opcback.inventory.service.InventoryService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
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

    /**
     * RF-05 — configura el stock mínimo/máximo de un producto en una
     * sucursal. La autorización por sucursal se aplica en el service
     * (BranchAccessService), igual que en el registro de movimientos.
     */
    @PutMapping("/sucursal/{branchId}/producto/{productId}/umbrales")
    public InventoryResponse updateThresholds(
            @PathVariable Long branchId, @PathVariable Long productId,
            @Valid @RequestBody InventoryThresholdRequest request, Authentication authentication) {
        return inventoryService.updateThresholds(branchId, productId, request, authentication);
    }

    @PostMapping("/movimientos")
    public ResponseEntity<InventoryMovementResponse> registerMovement(
            @Valid @RequestBody InventoryMovementRequest request, Authentication authentication) {
        InventoryMovementResponse response = inventoryMovementService.register(request, authentication);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Historial de movimientos de inventario (sección 3.1). Acotado por
     * sucursal según el rol: ADMIN_GENERAL ve todos, el resto solo los de
     * sus sucursales asignadas — la decisión se toma en el service. Filtros
     * opcionales: sucursal, producto, tipo de movimiento y rango de fechas.
     */
    @GetMapping("/movimientos")
    public List<InventoryMovementHistoryResponse> movementHistory(
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) Long productId,
            @RequestParam(required = false) MovementType movementType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            Authentication authentication) {
        return inventoryMovementService.history(branchId, productId, movementType, from, to, authentication);
    }
}
