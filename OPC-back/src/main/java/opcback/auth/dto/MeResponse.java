package opcback.auth.dto;

/**
 * branches: mismo shape que LoginResponse.branches — List<Long> o el
 * literal "todas" para GENERAL_ADMIN.
 */
public record MeResponse(
        Long userId,
        String name,
        String email,
        String role,
        Object branches
) {
}
