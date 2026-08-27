package opcback.sales.dto;

import jakarta.validation.constraints.NotBlank;

public record CustomerRequest(
        @NotBlank String name,
        String documentType,
        String documentNumber,
        String phone,
        String email
) {
}
