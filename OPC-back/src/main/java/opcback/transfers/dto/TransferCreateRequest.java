package opcback.transfers.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import opcback.transfers.entity.TransferUrgency;

import java.util.List;

public record TransferCreateRequest(
        @NotNull Long originBranchId,
        @NotNull Long destinationBranchId,
        @NotNull TransferUrgency urgency,
        @NotEmpty(message = "La transferencia debe tener al menos un ítem") List<@Valid TransferItemRequest> items
) {
}
