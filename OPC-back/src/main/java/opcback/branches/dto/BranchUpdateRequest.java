package opcback.branches.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * El código no es editable — es la clave de negocio de la sucursal,
 * se asigna una sola vez al crearla.
 */
public record BranchUpdateRequest(
        @NotBlank String name,
        String address,
        String city,
        String phone
) {
}
