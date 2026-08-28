package opcback.transfers.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record TransferPrepareRequest(
        @NotEmpty(message = "Debes confirmar la cantidad a enviar de al menos un ítem") List<@Valid PrepareItemRequest> items
) {
}
