package opcback.branches.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import opcback.branches.dto.BranchCreateRequest;
import opcback.branches.dto.BranchResponse;
import opcback.branches.dto.BranchUpdateRequest;
import opcback.branches.service.BranchService;
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
 * Lectura abierta a cualquier rol autenticado — cualquier usuario necesita
 * saber qué sucursales existen para consultar/registrar inventario en otra
 * (sección 2.1 del PDF). Escritura (crear/editar/desactivar) sigue siendo
 * solo del Administrador general, según la tabla de actores. "Desactivar"
 * es borrado lógico (active = false vía BranchService.deactivate); no hay
 * DELETE físico. El código único de sucursal se valida vía la restricción
 * UNIQUE de ma_branches.code — un código repetido termina en 409.
 */
@RestController
@RequestMapping("/api/branches")
@RequiredArgsConstructor
public class BranchController {

    private final BranchService branchService;

    @GetMapping
    public List<BranchResponse> listAll() {
        return branchService.listAll();
    }

    @GetMapping("/{id}")
    public BranchResponse getById(@PathVariable Long id) {
        return branchService.getById(id);
    }

    @PreAuthorize("hasRole('GENERAL_ADMIN')")
    @PostMapping
    public ResponseEntity<BranchResponse> create(@Valid @RequestBody BranchCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(branchService.create(request));
    }

    @PreAuthorize("hasRole('GENERAL_ADMIN')")
    @PutMapping("/{id}")
    public BranchResponse update(@PathVariable Long id, @Valid @RequestBody BranchUpdateRequest request) {
        return branchService.update(id, request);
    }

    @PreAuthorize("hasRole('GENERAL_ADMIN')")
    @PatchMapping("/{id}/deactivate")
    public BranchResponse deactivate(@PathVariable Long id) {
        return branchService.deactivate(id);
    }
}
