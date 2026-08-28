package opcback.transfers.dto;

import opcback.transfers.entity.Transfer;
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
        String carrier,
        BigDecimal shippingCost,
        LocalDateTime requestDate,
        LocalDateTime actualDispatchDate,
        LocalDateTime estimatedArrivalDate,
        LocalDateTime actualArrivalDate,
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
                transfer.getCarrier(),
                transfer.getShippingCost(),
                transfer.getRequestDate(),
                transfer.getActualDispatchDate(),
                transfer.getEstimatedArrivalDate(),
                transfer.getActualArrivalDate(),
                items);
    }
}
