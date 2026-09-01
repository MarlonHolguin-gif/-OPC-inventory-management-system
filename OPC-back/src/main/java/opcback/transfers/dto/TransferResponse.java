package opcback.transfers.dto;

import opcback.transfers.entity.ShortageResolution;
import opcback.transfers.entity.Transfer;
import opcback.transfers.entity.TransferRoutePriority;
import opcback.transfers.entity.TransferStatus;
import opcback.transfers.entity.TransferUrgency;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record TransferResponse(
        Long id,
        String transferNumber,
        Long originBranchId,
        Long destinationBranchId,
        Long requestedBy,
        TransferStatus status,
        TransferUrgency urgency,
        TransferRoutePriority routePriority,
        String carrier,
        BigDecimal shippingCost,
        LocalDateTime requestDate,
        LocalDateTime estimatedDispatchDate,
        LocalDateTime actualDispatchDate,
        LocalDateTime estimatedArrivalDate,
        LocalDateTime actualArrivalDate,
        ShortageResolution shortageResolution,
        String shortageResolutionNotes,
        LocalDateTime shortageResolvedAt,
        Long reshipmentTransferId,
        List<TransferItemResponse> items
) {
    public static TransferResponse from(Transfer transfer, List<TransferItemResponse> items) {
        return new TransferResponse(
                transfer.getId(),
                transfer.getTransferNumber(),
                transfer.getOriginBranchId(),
                transfer.getDestinationBranchId(),
                transfer.getRequestedBy(),
                transfer.getStatus(),
                transfer.getUrgency(),
                transfer.getRoutePriority(),
                transfer.getCarrier(),
                transfer.getShippingCost(),
                transfer.getRequestDate(),
                transfer.getEstimatedDispatchDate(),
                transfer.getActualDispatchDate(),
                transfer.getEstimatedArrivalDate(),
                transfer.getActualArrivalDate(),
                transfer.getShortageResolution(),
                transfer.getShortageResolutionNotes(),
                transfer.getShortageResolvedAt(),
                transfer.getReshipmentTransferId(),
                items);
    }
}
