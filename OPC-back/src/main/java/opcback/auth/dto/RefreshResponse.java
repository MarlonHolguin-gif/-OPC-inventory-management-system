package opcback.auth.dto;

public record RefreshResponse(
        String token,
        String tokenType,
        String refreshToken
) {
}
