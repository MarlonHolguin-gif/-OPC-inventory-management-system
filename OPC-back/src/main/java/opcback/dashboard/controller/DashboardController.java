package opcback.dashboard.controller;

import lombok.RequiredArgsConstructor;
import opcback.dashboard.dto.ActiveTransfersImpactResponse;
import opcback.dashboard.dto.BranchComparisonRow;
import opcback.dashboard.dto.MonthlySalesPoint;
import opcback.dashboard.dto.ProductRotationRow;
import opcback.dashboard.service.DashboardService;
import opcback.inventory.dto.InventoryResponse;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Dashboard / KPIs operativos, todo de solo lectura. Los cuatro primeros
 * endpoints se filtran por sucursal (branchId obligatorio — Spring responde
 * 400 si falta) y están abiertos a cualquier rol autenticado, igual que el
 * resto de los reportes de lectura de la app. El quinto (comparativa entre
 * sucursales) es la única excepción — sin filtro de sucursal y restringido
 * a ADMIN_GENERAL, ver criterio de aceptación de esa tarjeta.
 */
@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/sales-trend")
    public List<MonthlySalesPoint> salesTrend(@RequestParam Long branchId) {
        return dashboardService.salesTrend(branchId);
    }

    @GetMapping("/inventory-rotation")
    public List<ProductRotationRow> inventoryRotation(
            @RequestParam Long branchId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(required = false, defaultValue = "DESC") String order) {
        return dashboardService.inventoryRotation(branchId, from, to, "ASC".equalsIgnoreCase(order));
    }

    @GetMapping("/active-transfers-impact")
    public ActiveTransfersImpactResponse activeTransfersImpact(@RequestParam Long branchId) {
        return dashboardService.activeTransfersImpact(branchId);
    }

    @GetMapping("/low-stock")
    public List<InventoryResponse> lowStock(@RequestParam Long branchId) {
        return dashboardService.lowStockProducts(branchId);
    }

    @PreAuthorize("hasRole('GENERAL_ADMIN')")
    @GetMapping("/branch-comparison")
    public List<BranchComparisonRow> branchComparison() {
        return dashboardService.branchComparison();
    }
}
