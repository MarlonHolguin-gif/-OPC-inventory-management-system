package opcback.auth.dto;

public record LoginResponse(
        String token,
        String tokenType,
        Long userId,
        String name,
        String email,
        String role
) {
}
