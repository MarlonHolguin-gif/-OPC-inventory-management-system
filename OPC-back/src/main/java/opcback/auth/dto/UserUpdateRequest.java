package opcback.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record UserUpdateRequest(
        @NotBlank String name,
        @NotBlank @Email String email,
        @NotBlank String roleCode
) {
}
