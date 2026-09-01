package opcback.dashboard.dto;

import opcback.transfers.entity.TransferStatus;

import java.util.List;

public record ActiveTransfersImpactResponse(
        long activeTransfersAsOrigin,
        long activeTransfersAsDestination,
        List<StatusCount> statusBreakdown,
        List<TransferImpactRow> byProduct
) {
    /** Cuántas transferencias activas de la sucursal están en cada estado. */
    public record StatusCount(TransferStatus status, long count) {
    }
}
