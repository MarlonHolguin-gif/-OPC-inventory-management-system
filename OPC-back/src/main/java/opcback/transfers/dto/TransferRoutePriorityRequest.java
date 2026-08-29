package opcback.transfers.dto;

import jakarta.validation.constraints.NotNull;
import opcback.transfers.entity.TransferRoutePriority;

public record TransferRoutePriorityRequest(
        @NotNull TransferRoutePriority routePriority
) {
}
