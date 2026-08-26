package opcback.purchases.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import opcback.purchases.dto.SupplierRequest;
import opcback.purchases.dto.SupplierResponse;
import opcback.purchases.service.SupplierService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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
 * Lectura abierta a cualquier rol autenticado (se necesita para crear
 * órdenes de compra); escritura solo ADMIN_GENERAL, igual que el resto
 * del catálogo maestro.
 */
@RestController
@RequestMapping("/api/suppliers")
@RequiredArgsConstructor
public class SupplierController {

    private final SupplierService supplierService;

    @GetMapping
    public List<SupplierResponse> listAll() {
        return supplierService.listAll();
    }

    @GetMapping("/{id}")
    public SupplierResponse getById(@PathVariable Long id) {
        return supplierService.getById(id);
    }

    @PreAuthorize("hasRole('GENERAL_ADMIN')")
    @PostMapping
    public ResponseEntity<SupplierResponse> create(@Valid @RequestBody SupplierRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(supplierService.create(request));
    }

    @PreAuthorize("hasRole('GENERAL_ADMIN')")
    @PutMapping("/{id}")
    public SupplierResponse update(@PathVariable Long id, @Valid @RequestBody SupplierRequest request) {
        return supplierService.update(id, request);
    }

    @PreAuthorize("hasRole('GENERAL_ADMIN')")
    @PatchMapping("/{id}/deactivate")
    public SupplierResponse deactivate(@PathVariable Long id) {
        return supplierService.deactivate(id);
    }

    @PreAuthorize("hasRole('GENERAL_ADMIN')")
    @PatchMapping("/{id}/reactivate")
    public SupplierResponse reactivate(@PathVariable Long id) {
        return supplierService.reactivate(id);
    }
}
