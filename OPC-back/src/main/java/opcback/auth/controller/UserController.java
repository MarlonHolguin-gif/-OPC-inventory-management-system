package opcback.auth.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import opcback.auth.dto.ChangePasswordRequest;
import opcback.auth.dto.UserCreateRequest;
import opcback.auth.dto.UserResponse;
import opcback.auth.dto.UserUpdateRequest;
import opcback.auth.service.UserBranchService;
import opcback.auth.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Gestión de usuarios — solo el Administrador general, según la tabla de
 * actores de Analisis_Requerimientos.md sección 7. "Desactivar" es borrado
 * lógico (active = false vía UserService.deactivate); no existe DELETE
 * físico en este controller. Los endpoints de /branches manejan ma_user_branch
 * (una fila de asociación, no un recurso con historial propio) — ahí sí es
 * un DELETE físico al revocar, y asignar/revocar son idempotentes.
 */
@RestController
@RequestMapping("/api/users")
@PreAuthorize("hasRole('GENERAL_ADMIN')")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final UserBranchService userBranchService;

    @GetMapping
    public List<UserResponse> listAll() {
        return userService.listAll();
    }

    @GetMapping("/{id}")
    public UserResponse getById(@PathVariable Long id) {
        return userService.getById(id);
    }

    @PostMapping
    public ResponseEntity<UserResponse> create(@Valid @RequestBody UserCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.create(request));
    }

    @PutMapping("/{id}")
    public UserResponse update(@PathVariable Long id, @Valid @RequestBody UserUpdateRequest request) {
        return userService.update(id, request);
    }

    @PatchMapping("/{id}/deactivate")
    public UserResponse deactivate(@PathVariable Long id) {
        return userService.deactivate(id);
    }

    @PatchMapping("/{id}/reactivate")
    public UserResponse reactivate(@PathVariable Long id) {
        return userService.reactivate(id);
    }

    @PatchMapping("/{id}/password")
    public UserResponse changePassword(@PathVariable Long id, @Valid @RequestBody ChangePasswordRequest request) {
        return userService.changePassword(id, request);
    }

    @GetMapping("/{id}/branches")
    public List<Long> listBranches(@PathVariable Long id) {
        return userBranchService.listBranchIds(id);
    }

    @PutMapping("/{id}/branches/{branchId}")
    public List<Long> assignBranch(@PathVariable Long id, @PathVariable Long branchId) {
        return userBranchService.assign(id, branchId);
    }

    @DeleteMapping("/{id}/branches/{branchId}")
    public List<Long> revokeBranch(@PathVariable Long id, @PathVariable Long branchId) {
        return userBranchService.revoke(id, branchId);
    }
}
