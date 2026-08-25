package opcback.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
        @NotBlank @Size(min = 8, message = "La contraseña debe tener al menos 8 caracteres") String newPassword
) {
}
