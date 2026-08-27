package opcback.sales.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import opcback.sales.dto.PriceListCreateRequest;
import opcback.sales.dto.PriceListItemRequest;
import opcback.sales.dto.PriceListResponse;
import opcback.sales.dto.PriceListUpdateRequest;
import opcback.sales.service.PriceListService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Lectura abierta a cualquier rol autenticado (se necesita para resolver
 * el precio de un producto al registrar una venta); escritura solo
 * ADMIN_GENERAL, igual que el resto del catálogo maestro.
 */
@RestController
@RequestMapping("/api/price-lists")
@RequiredArgsConstructor
public class PriceListController {

    private final PriceListService priceListService;

    @GetMapping
    public List<PriceListResponse> listAll() {
        return priceListService.listAll();
    }

    @GetMapping("/{id}")
    public PriceListResponse getById(@PathVariable Long id) {
        return priceListService.getById(id);
    }

    @PreAuthorize("hasRole('GENERAL_ADMIN')")
    @PostMapping
    public ResponseEntity<PriceListResponse> create(@Valid @RequestBody PriceListCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(priceListService.create(request));
    }

    @PreAuthorize("hasRole('GENERAL_ADMIN')")
    @PutMapping("/{id}")
    public PriceListResponse update(@PathVariable Long id, @Valid @RequestBody PriceListUpdateRequest request) {
        return priceListService.update(id, request);
    }

    @PreAuthorize("hasRole('GENERAL_ADMIN')")
    @PatchMapping("/{id}/deactivate")
    public PriceListResponse deactivate(@PathVariable Long id) {
        return priceListService.deactivate(id);
    }

    @PreAuthorize("hasRole('GENERAL_ADMIN')")
    @PatchMapping("/{id}/reactivate")
    public PriceListResponse reactivate(@PathVariable Long id) {
        return priceListService.reactivate(id);
    }

    @PreAuthorize("hasRole('GENERAL_ADMIN')")
    @PostMapping("/{id}/items")
    public PriceListResponse upsertItem(@PathVariable Long id, @Valid @RequestBody PriceListItemRequest request) {
        return priceListService.upsertItem(id, request);
    }

    @PreAuthorize("hasRole('GENERAL_ADMIN')")
    @DeleteMapping("/{id}/items/{productId}")
    public PriceListResponse removeItem(@PathVariable Long id, @PathVariable Long productId) {
        return priceListService.removeItem(id, productId);
    }
}
