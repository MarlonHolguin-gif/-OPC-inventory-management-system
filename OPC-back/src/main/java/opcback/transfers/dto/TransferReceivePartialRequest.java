package opcback.transfers.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record TransferReceivePartialRequest(
        @NotEmpty(message = "Debes registrar la cantidad recibida de al menos un ítem") List<@Valid ReceivePartialItemRequest> items
) {
}
