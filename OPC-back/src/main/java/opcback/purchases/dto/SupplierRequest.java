package opcback.purchases.dto;

import jakarta.validation.constraints.NotBlank;

public record SupplierRequest(
        @NotBlank String name,
        String taxId,
        String contact,
        String phone,
        String email,
        String address
) {
}
