package opcback.transfers.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import opcback.transfers.dto.TransferCreateRequest;
import opcback.transfers.dto.TransferDispatchRequest;
import opcback.transfers.dto.TransferEventResponse;
import opcback.transfers.dto.TransferPrepareRequest;
import opcback.transfers.dto.TransferReceivePartialRequest;
import opcback.transfers.dto.TransferResponse;
import opcback.transfers.service.TransferService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
    public List<TransferResponse> listAll() {
        return transferService.listAll();
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
