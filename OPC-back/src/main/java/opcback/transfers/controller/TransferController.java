package opcback.transfers.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import opcback.transfers.dto.LogisticsComplianceRow;
import opcback.transfers.dto.TransferCreateRequest;
import opcback.transfers.dto.TransferDispatchRequest;
import opcback.transfers.dto.TransferEventResponse;
import opcback.transfers.dto.TransferPrepareRequest;
import opcback.transfers.dto.TransferReceivePartialRequest;
import opcback.transfers.dto.TransferResponse;
import opcback.transfers.dto.TransferRoutePriorityRequest;
import opcback.transfers.entity.TransferRoutePriority;
import opcback.transfers.service.TransferService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Cualquier rol autenticado puede leer y accionar una transferencia — la
 * restricción real es de sucursal (BranchAccessService, ver TransferService:
 * destino para solicitar/recibir, origen para preparar/despachar), igual
 * que en Compras, Ventas y Movimientos.
 */
@RestController
@RequestMapping("/api/transfers")
@RequiredArgsConstructor
public class TransferController {

    private final TransferService transferService;

    @GetMapping
    public List<TransferResponse> listAll(@RequestParam(required = false) TransferRoutePriority routePriority) {
        return transferService.listAll(routePriority);
    }

    /**
     * Reporte de cumplimiento logístico: % de transferencias con
     * fecha_llegada_real <= fecha_estimada_llegada, agrupado por sucursal
     * origen y prioridad de ruta. El rango filtra por fecha_llegada_real
     * (la fecha que el reporte mide), no por fecha de solicitud.
     */
    @GetMapping("/reports/compliance")
    public List<LogisticsComplianceRow> complianceReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
        return transferService.complianceReport(from, to);
    }

    @GetMapping("/{id}")
    public TransferResponse getById(@PathVariable Long id) {
        return transferService.getById(id);
    }

    @GetMapping("/{id}/events")
    public List<TransferEventResponse> events(@PathVariable Long id) {
        return transferService.events(id);
    }

    @PostMapping
    public ResponseEntity<TransferResponse> create(
            @Valid @RequestBody TransferCreateRequest request, Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED).body(transferService.create(request, authentication));
    }

    @PatchMapping("/{id}/route-priority")
    public TransferResponse updateRoutePriority(
            @PathVariable Long id, @Valid @RequestBody TransferRoutePriorityRequest request, Authentication authentication) {
        return transferService.updateRoutePriority(id, request, authentication);
    }

    @PostMapping("/{id}/prepare")
    public TransferResponse prepare(
            @PathVariable Long id, @Valid @RequestBody TransferPrepareRequest request, Authentication authentication) {
        return transferService.prepare(id, request, authentication);
    }

    @PostMapping("/{id}/dispatch")
    public TransferResponse dispatch(
            @PathVariable Long id, @Valid @RequestBody TransferDispatchRequest request, Authentication authentication) {
        return transferService.dispatch(id, request, authentication);
    }

    @PostMapping("/{id}/receive-complete")
    public TransferResponse receiveComplete(@PathVariable Long id, Authentication authentication) {
        return transferService.receiveComplete(id, authentication);
    }

    @PostMapping("/{id}/receive-partial")
    public TransferResponse receivePartial(
            @PathVariable Long id, @Valid @RequestBody TransferReceivePartialRequest request, Authentication authentication) {
        return transferService.receivePartial(id, request, authentication);
    }
}
