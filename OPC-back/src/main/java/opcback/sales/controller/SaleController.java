package opcback.sales.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import opcback.sales.dto.SaleCreateRequest;
import opcback.sales.dto.SaleHistoryItemResponse;
import opcback.sales.dto.SaleResponse;
import opcback.sales.service.SaleService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Cualquier rol autenticado puede registrar una venta — la restricción
 * real es de sucursal (BranchAccessService), no de rol, igual que compras
 * y movimientos de inventario.
 */
@RestController
@RequestMapping("/api/sales")
@RequiredArgsConstructor
public class SaleController {

    private final SaleService saleService;

    @GetMapping
    public List<SaleResponse> listAll() {
        return saleService.listAll();
    }

    @GetMapping("/history")
    public List<SaleHistoryItemResponse> history(
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) Long productId,
            @RequestParam(required = false) Long customerId,
            @RequestParam(required = false) Long sellerId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
        return saleService.history(branchId, productId, customerId, sellerId, from, to);
    }

    @GetMapping("/{id}")
    public SaleResponse getById(@PathVariable Long id) {
        return saleService.getById(id);
    }

    @PostMapping
    public ResponseEntity<SaleResponse> register(@Valid @RequestBody SaleCreateRequest request, Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED).body(saleService.register(request, authentication));
    }
}
