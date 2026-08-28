package opcback.transfers.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.LocalDateTime;

public record TransferDispatchRequest(
        @NotBlank String carrier,
        LocalDateTime estimatedArrivalDate
) {
}
