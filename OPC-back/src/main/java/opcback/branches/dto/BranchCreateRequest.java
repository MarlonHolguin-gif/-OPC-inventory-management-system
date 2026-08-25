package opcback.branches.dto;

import jakarta.validation.constraints.NotBlank;

public record BranchCreateRequest(
        @NotBlank String code,
        @NotBlank String name,
        String address,
        String city,
        String phone
) {
}
