package opcback.transfers.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import opcback.transfers.entity.ShortageResolution;

/**
 * Decisión de tratamiento del faltante de una recepción parcial: reenvío,
 * ajuste o reclamación, con una nota opcional que la justifica.
 */
public record TransferShortageResolutionRequest(
        @NotNull(message = "Debes indicar el tratamiento del faltante") ShortageResolution resolution,
        @Size(max = 500, message = "Las notas no pueden superar los 500 caracteres") String notes
) {
}
