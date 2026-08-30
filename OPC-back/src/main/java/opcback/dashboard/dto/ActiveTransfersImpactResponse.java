package opcback.dashboard.dto;

import java.util.List;

public record ActiveTransfersImpactResponse(
        long activeTransfersAsOrigin,
        long activeTransfersAsDestination,
        List<TransferImpactRow> byProduct
) {
}
