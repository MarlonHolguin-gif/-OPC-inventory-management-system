package opcback.transfers.dto;

import opcback.transfers.entity.TransferEvent;
import opcback.transfers.entity.TransferStatus;

import java.time.LocalDateTime;

public record TransferEventResponse(
        Long id,
        TransferStatus status,
        LocalDateTime eventDate,
        String notes,
        Long recordedBy
) {
    public static TransferEventResponse from(TransferEvent event) {
        return new TransferEventResponse(
                event.getId(), event.getStatus(), event.getEventDate(), event.getNotes(), event.getRecordedBy());
    }
}
