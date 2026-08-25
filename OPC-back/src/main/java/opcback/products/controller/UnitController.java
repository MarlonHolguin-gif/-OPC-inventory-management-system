package opcback.products.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import opcback.products.dto.UnitRequest;
import opcback.products.dto.UnitResponse;
import opcback.products.service.UnitService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Lectura abierta a cualquier rol autenticado (se necesita para registrar
 * ventas/compras/inventario); escritura solo ADMIN_GENERAL, igual que el
 * resto del catálogo.
 */
@RestController
@RequestMapping("/api/units")
@RequiredArgsConstructor
public class UnitController {

    private final UnitService unitService;

    @GetMapping
    public List<UnitResponse> listAll() {
        return unitService.listAll();
    }

    @GetMapping("/{id}")
    public UnitResponse getById(@PathVariable Long id) {
        return unitService.getById(id);
    }

    @PreAuthorize("hasRole('GENERAL_ADMIN')")
    @PostMapping
    public ResponseEntity<UnitResponse> create(@Valid @RequestBody UnitRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(unitService.create(request));
    }

    @PreAuthorize("hasRole('GENERAL_ADMIN')")
    @PutMapping("/{id}")
    public UnitResponse update(@PathVariable Long id, @Valid @RequestBody UnitRequest request) {
        return unitService.update(id, request);
    }
}
