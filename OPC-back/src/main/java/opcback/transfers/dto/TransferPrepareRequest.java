package opcback.transfers.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.time.LocalDateTime;
import java.util.List;

/**
 * La sucursal origen, al preparar el envío, confirma las cantidades y —
 * opcionalmente — deja registrada la fecha en que estima despacharlo. Esa
 * estimación se compara luego contra la fecha real de despacho (sección 3.5:
 * tiempos estimados vs. reales).
 */
public record TransferPrepareRequest(
        LocalDateTime estimatedDispatchDate,
        @NotEmpty(message = "Debes confirmar la cantidad a enviar de al menos un ítem") List<@Valid PrepareItemRequest> items
) {
}
