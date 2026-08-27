package opcback.sales.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import opcback.sales.dto.CustomerRequest;
import opcback.sales.dto.CustomerResponse;
import opcback.sales.service.CustomerService;
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
 * Lectura abierta a cualquier rol autenticado (se necesita para registrar
 * una venta con cliente); escritura solo ADMIN_GENERAL, igual que el resto
 * del catálogo maestro.
 */
@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;

    @GetMapping
    public List<CustomerResponse> listAll() {
        return customerService.listAll();
    }

    @GetMapping("/{id}")
    public CustomerResponse getById(@PathVariable Long id) {
        return customerService.getById(id);
    }

    @PreAuthorize("hasRole('GENERAL_ADMIN')")
    @PostMapping
    public ResponseEntity<CustomerResponse> create(@Valid @RequestBody CustomerRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(customerService.create(request));
    }

    @PreAuthorize("hasRole('GENERAL_ADMIN')")
    @PutMapping("/{id}")
    public CustomerResponse update(@PathVariable Long id, @Valid @RequestBody CustomerRequest request) {
        return customerService.update(id, request);
    }

    @PreAuthorize("hasRole('GENERAL_ADMIN')")
    @PatchMapping("/{id}/deactivate")
    public CustomerResponse deactivate(@PathVariable Long id) {
        return customerService.deactivate(id);
    }

    @PreAuthorize("hasRole('GENERAL_ADMIN')")
    @PatchMapping("/{id}/reactivate")
    public CustomerResponse reactivate(@PathVariable Long id) {
        return customerService.reactivate(id);
    }
}
