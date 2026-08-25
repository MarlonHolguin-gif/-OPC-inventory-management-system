package opcback.auth.dto;

import opcback.auth.entity.User;

import java.time.LocalDateTime;

/**
 * Nunca incluye password_hash — este es el único shape en el que un
 * usuario sale de la API.
 */
public record UserResponse(
        Long id,
        String name,
        String email,
        String roleCode,
        boolean active,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole().getCode(),
                user.isActive(),
                user.getCreatedAt(),
                user.getUpdatedAt());
    }
}
