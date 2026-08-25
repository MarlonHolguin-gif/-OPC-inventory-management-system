package opcback.auth.dto;

/**
 * branches: List<Long> con los branch_id accesibles para el usuario, o el
 * literal "todas" cuando el rol es GENERAL_ADMIN (no tiene filas en
 * ma_user_branch — ve todas las sucursales por rol, ver DER.md 3.1).
 */
public record LoginResponse(
        String token,
        String tokenType,
        Long userId,
        String name,
        String email,
        String role,
        Object branches
) {
}
