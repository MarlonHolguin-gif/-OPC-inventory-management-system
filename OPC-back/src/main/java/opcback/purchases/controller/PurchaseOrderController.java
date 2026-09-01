package opcback.purchases.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import opcback.purchases.dto.PurchaseHistoryItemResponse;
import opcback.purchases.dto.PurchaseOrderCreateRequest;
import opcback.purchases.dto.PurchaseOrderResponse;
import opcback.purchases.dto.PurchaseReceiptCreateRequest;
import opcback.purchases.dto.PurchaseReceiptResponse;
import opcback.purchases.service.PurchaseOrderService;
import opcback.purchases.service.PurchaseReceiptService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
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
 * Cualquier rol autenticado puede crear órdenes/recepciones — la
 * restricción real es de sucursal (BranchAccessService), no de rol, igual
 * que el registro de movimientos de inventario.
 */
@RestController
@RequestMapping("/api/purchase-orders")
@RequiredArgsConstructor
public class PurchaseOrderController {

    private final PurchaseOrderService purchaseOrderService;
    private final PurchaseReceiptService purchaseReceiptService;

    @GetMapping
    public List<PurchaseOrderResponse> listAll() {
        return purchaseOrderService.listAll();
    }

    @GetMapping("/history")
    public List<PurchaseHistoryItemResponse> history(
            @RequestParam(required = false) Long supplierId,
            @RequestParam(required = false) Long productId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
        return purchaseOrderService.history(supplierId, productId, from, to);
    }

    @GetMapping("/{id}")
    public PurchaseOrderResponse getById(@PathVariable Long id) {
        return purchaseOrderService.getById(id);
    }

    @PostMapping
    public ResponseEntity<PurchaseOrderResponse> create(
            @Valid @RequestBody PurchaseOrderCreateRequest request, Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED).body(purchaseOrderService.create(request, authentication));
    }

    @PutMapping("/{id}")
    public PurchaseOrderResponse update(
            @PathVariable Long id, @Valid @RequestBody PurchaseOrderCreateRequest request, Authentication authentication) {
        return purchaseOrderService.update(id, request, authentication);
    }

    @PatchMapping("/{id}/send")
    public PurchaseOrderResponse markAsSent(@PathVariable Long id, Authentication authentication) {
        return purchaseOrderService.markAsSent(id, authentication);
    }

    @PatchMapping("/{id}/cancel")
    public PurchaseOrderResponse cancel(@PathVariable Long id, Authentication authentication) {
        return purchaseOrderService.cancel(id, authentication);
    }

    @PostMapping("/{id}/receipts")
    public ResponseEntity<PurchaseReceiptResponse> registerReceipt(
            @PathVariable Long id, @Valid @RequestBody PurchaseReceiptCreateRequest request, Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED).body(purchaseReceiptService.register(id, request, authentication));
    }
}
