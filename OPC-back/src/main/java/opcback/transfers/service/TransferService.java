package opcback.transfers.service;

import lombok.RequiredArgsConstructor;
import opcback.auth.repository.UserRepository;
import opcback.exception.ResourceNotFoundException;
import opcback.inventory.dto.InventoryMovementRequest;
import opcback.inventory.entity.MovementType;
import opcback.inventory.repository.InventoryRepository;
import opcback.inventory.service.InventoryMovementService;
import opcback.products.entity.Product;
import opcback.products.repository.ProductRepository;
import opcback.security.BranchAccessService;
import opcback.transfers.dto.LogisticsComplianceRow;
import opcback.transfers.dto.PrepareItemRequest;
import opcback.transfers.dto.ReceivePartialItemRequest;
import opcback.transfers.dto.TransferCreateRequest;
import opcback.transfers.dto.TransferDispatchRequest;
import opcback.transfers.dto.TransferEventResponse;
import opcback.transfers.dto.TransferItemRequest;
import opcback.transfers.dto.TransferItemResponse;
import opcback.transfers.dto.TransferPrepareRequest;
import opcback.transfers.dto.TransferReceivePartialRequest;
import opcback.transfers.dto.TransferResponse;
import opcback.transfers.dto.TransferRoutePriorityRequest;
import opcback.transfers.entity.Transfer;
import opcback.transfers.entity.TransferEvent;
import opcback.transfers.entity.TransferItem;
import opcback.transfers.entity.TransferRoutePriority;
import opcback.transfers.entity.TransferStatus;
import opcback.transfers.repository.TransferEventRepository;
import opcback.transfers.repository.TransferRepository;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Máquina de estados de una transferencia entre sucursales (sección 3.4
 * del PDF): SOLICITADA -> EN_PREPARACION -> EN_TRANSITO -> RECIBIDA_(COMPLETA|PARCIAL).
 * Cada transición valida su propio precondition de estado, reutiliza
 * InventoryMovementService para los movimientos TRANSFER_OUT/TRANSFER_IN
 * (el stock de origen se descuenta al despachar, no al preparar; el de
 * destino se actualiza al recibir, no antes), y siempre termina
 * registrando un TransferEvent — el historial completo de una
 * transferencia debe poder reconstruirse solo a partir de esa tabla.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TransferService {

    private static final Set<TransferStatus> TERMINAL_STATUSES =
            EnumSet.of(TransferStatus.FULLY_RECEIVED, TransferStatus.PARTIALLY_RECEIVED, TransferStatus.CANCELLED);

    private final TransferRepository transferRepository;
    private final TransferEventRepository transferEventRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final InventoryRepository inventoryRepository;
    private final BranchAccessService branchAccessService;
    private final InventoryMovementService inventoryMovementService;

    public List<TransferResponse> listAll(TransferRoutePriority routePriority) {
        return transferRepository.findAllFiltered(routePriority).stream().map(this::toResponse).toList();
    }

    /**
     * Reporte de cumplimiento logístico: % de transferencias con
     * fecha_llegada_real <= fecha_estimada_llegada, agrupado por sucursal
     * origen y prioridad de ruta, filtrable por rango de fecha_llegada_real.
     * Solo entran transferencias que ya llegaron y tenían fecha estimada —
     * una transferencia sin fecha estimada no tiene con qué compararse, así
     * que queda fuera del denominador (no cuenta como incumplimiento).
     */
    public List<LogisticsComplianceRow> complianceReport(LocalDateTime from, LocalDateTime to) {
        Map<GroupKey, List<Transfer>> grouped = transferRepository.findForComplianceReport(from, to).stream()
                .collect(Collectors.groupingBy(t -> new GroupKey(t.getOriginBranchId(), t.getRoutePriority())));

        return grouped.entrySet().stream()
                .map(entry -> {
                    List<Transfer> transfers = entry.getValue();
                    long total = transfers.size();
                    long onTime = transfers.stream()
                            .filter(t -> !t.getActualArrivalDate().isAfter(t.getEstimatedArrivalDate()))
                            .count();
                    BigDecimal percentage = BigDecimal.valueOf(onTime)
                            .multiply(BigDecimal.valueOf(100))
                            .divide(BigDecimal.valueOf(total), 1, RoundingMode.HALF_UP);
                    return new LogisticsComplianceRow(
                            entry.getKey().originBranchId(), entry.getKey().routePriority(), total, onTime, percentage);
                })
                .sorted(Comparator.<LogisticsComplianceRow, Long>comparing(LogisticsComplianceRow::originBranchId)
                        .thenComparing(LogisticsComplianceRow::routePriority))
                .toList();
    }

    private record GroupKey(Long originBranchId, TransferRoutePriority routePriority) {
    }

    public TransferResponse getById(Long id) {
        return toResponse(findTransferOrThrow(id));
    }

    public List<TransferEventResponse> events(Long transferId) {
        return transferEventRepository.findByTransferIdOrderByEventDateAsc(transferId).stream()
                .map(TransferEventResponse::from)
                .toList();
    }

    /**
     * Card 1 — "la sucursal destino o un ADMIN_GENERAL puede generar la
     * solicitud": quien pide una transferencia es quien la va a recibir,
     * así que el chequeo de escritura es sobre la sucursal DESTINO, no la
     * de origen.
     */
    @Transactional
    public TransferResponse create(TransferCreateRequest request, Authentication authentication) {
        branchAccessService.assertCanWrite(authentication.getName(), request.destinationBranchId());

        if (request.originBranchId().equals(request.destinationBranchId())) {
            throw new IllegalArgumentException("La sucursal de origen y destino no pueden ser la misma");
        }

        Long requestedBy = resolveUserId(authentication);

        Transfer transfer = new Transfer();
        transfer.setOriginBranchId(request.originBranchId());
        transfer.setDestinationBranchId(request.destinationBranchId());
        transfer.setRequestedBy(requestedBy);
        transfer.setStatus(TransferStatus.REQUESTED);
        transfer.setUrgency(request.urgency());
        transfer.setRoutePriority(TransferRoutePriority.MEDIUM);
        transfer.setRequestDate(LocalDateTime.now());
        transfer.setCreatedAt(LocalDateTime.now());
        transfer.setTransferNumber(generateTransferNumber());

        for (TransferItemRequest itemRequest : request.items()) {
            Product product = productRepository.findById(itemRequest.productId())
                    .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado: " + itemRequest.productId()));

            TransferItem item = new TransferItem();
            item.setTransfer(transfer);
            item.setProduct(product);
            item.setRequestedQuantity(itemRequest.quantity());
            transfer.getItems().add(item);
        }

        Transfer saved = transferRepository.save(transfer);
        recordEvent(saved, TransferStatus.REQUESTED, "Solicitud creada", requestedBy);

        return toResponse(saved);
    }

    /**
     * Fija/cambia la prioridad de ruta — la decide quien gestiona el envío,
     * así que el chequeo de escritura es sobre la sucursal ORIGEN (mismo
     * criterio que preparar/despachar). Se bloquea una vez que la
     * transferencia ya llegó (completa o parcial): cambiarla después
     * corrompería el agrupado histórico del reporte de cumplimiento
     * logístico, que ya quedó calculado con la prioridad de ese momento.
     */
    @Transactional
    public TransferResponse updateRoutePriority(
            Long transferId, TransferRoutePriorityRequest request, Authentication authentication) {
        Transfer transfer = findTransferOrThrow(transferId);
        branchAccessService.assertCanWrite(authentication.getName(), transfer.getOriginBranchId());

        if (TERMINAL_STATUSES.contains(transfer.getStatus())) {
            throw new IllegalStateException(
                    "La transferencia " + transfer.getTransferNumber() + " ya está finalizada (estado: "
                            + transfer.getStatus() + "), no admite cambios de prioridad de ruta");
        }

        transfer.setRoutePriority(request.routePriority());
        Transfer saved = transferRepository.save(transfer);

        recordEvent(saved, saved.getStatus(), "Prioridad de ruta cambiada a " + request.routePriority(),
                resolveUserId(authentication));

        return toResponse(saved);
    }

    /**
     * Card 2 — la sucursal ORIGEN confirma/ajusta cuánto va a enviar de
     * cada ítem. No toca el inventario todavía (eso pasa recién en el
     * despacho, card 3) — solo valida que lo que promete enviar no supere
     * lo que hoy tiene disponible.
     */
    @Transactional
    public TransferResponse prepare(Long transferId, TransferPrepareRequest request, Authentication authentication) {
        Transfer transfer = findTransferOrThrow(transferId);
        branchAccessService.assertCanWrite(authentication.getName(), transfer.getOriginBranchId());

        if (transfer.getStatus() != TransferStatus.REQUESTED) {
            throw new IllegalStateException(
                    "La transferencia " + transfer.getTransferNumber() + " no está en estado solicitada (actual: "
                            + transfer.getStatus() + ")");
        }

        Map<Long, TransferItem> itemsById = transfer.getItems().stream()
                .collect(Collectors.toMap(TransferItem::getId, item -> item));

        for (PrepareItemRequest itemRequest : request.items()) {
            TransferItem item = itemsById.get(itemRequest.transferItemId());
            if (item == null) {
                throw new IllegalArgumentException(
                        "El ítem " + itemRequest.transferItemId() + " no pertenece a la transferencia " + transfer.getTransferNumber());
            }

            BigDecimal available = inventoryRepository
                    .findByBranchIdAndProductId(transfer.getOriginBranchId(), item.getProduct().getId())
                    .map(inv -> inv.getCurrentQuantity())
                    .orElse(BigDecimal.ZERO);

            if (itemRequest.shippedQuantity().compareTo(available) > 0) {
                throw new IllegalStateException("Stock insuficiente en la sucursal de origen para "
                        + item.getProduct().getName() + ": disponible " + formatQuantity(available)
                        + ", solicitado enviar " + formatQuantity(itemRequest.shippedQuantity()));
            }

            item.setShippedQuantity(itemRequest.shippedQuantity());
        }

        transfer.setStatus(TransferStatus.IN_PREPARATION);
        Transfer saved = transferRepository.save(transfer);
        recordEvent(saved, TransferStatus.IN_PREPARATION, "Envío preparado", resolveUserId(authentication));

        return toResponse(saved);
    }

    /**
     * Card 3 — despacho: recién aquí se descuenta el stock de origen (un
     * movimiento TRANSFER_OUT por ítem, vía InventoryMovementService, que
     * revalida disponibilidad al momento real del descuento — el
     * inventario pudo cambiar entre la preparación y el despacho).
     */
    @Transactional
    public TransferResponse dispatch(Long transferId, TransferDispatchRequest request, Authentication authentication) {
        Transfer transfer = findTransferOrThrow(transferId);
        branchAccessService.assertCanWrite(authentication.getName(), transfer.getOriginBranchId());

        if (transfer.getStatus() != TransferStatus.IN_PREPARATION) {
            throw new IllegalStateException(
                    "La transferencia " + transfer.getTransferNumber() + " no está en preparación (actual: "
                            + transfer.getStatus() + ")");
        }

        transfer.setCarrier(request.carrier());
        transfer.setEstimatedArrivalDate(request.estimatedArrivalDate());
        transfer.setActualDispatchDate(LocalDateTime.now());
        transfer.setStatus(TransferStatus.IN_TRANSIT);
        Transfer saved = transferRepository.save(transfer);

        for (TransferItem item : saved.getItems()) {
            if (item.getShippedQuantity() != null && item.getShippedQuantity().compareTo(BigDecimal.ZERO) > 0) {
                InventoryMovementRequest movementRequest = new InventoryMovementRequest(
                        saved.getOriginBranchId(),
                        item.getProduct().getId(),
                        MovementType.TRANSFER_OUT,
                        item.getShippedQuantity(),
                        null,
                        "Despacho de transferencia " + saved.getTransferNumber(),
                        "TRANSFER",
                        saved.getId(),
                        saved.getActualDispatchDate());
                inventoryMovementService.register(movementRequest, authentication);
            }
        }

        recordEvent(saved, TransferStatus.IN_TRANSIT, "Despachada (transportista: " + request.carrier() + ")",
                resolveUserId(authentication));

        return toResponse(saved);
    }

    /**
     * Card 4 — la sucursal DESTINO confirma que llegó todo lo despachado:
     * cantidad_recibida = cantidad_enviada por ítem, sin diferencia.
     */
    @Transactional
    public TransferResponse receiveComplete(Long transferId, Authentication authentication) {
        Transfer transfer = findTransferOrThrow(transferId);
        branchAccessService.assertCanWrite(authentication.getName(), transfer.getDestinationBranchId());

        if (transfer.getStatus() != TransferStatus.IN_TRANSIT) {
            throw new IllegalStateException(
                    "La transferencia " + transfer.getTransferNumber() + " no está en tránsito (actual: "
                            + transfer.getStatus() + ")");
        }

        transfer.setActualArrivalDate(LocalDateTime.now());
        transfer.setStatus(TransferStatus.FULLY_RECEIVED);
        Transfer saved = transferRepository.save(transfer);

        for (TransferItem item : saved.getItems()) {
            BigDecimal shipped = item.getShippedQuantity() != null ? item.getShippedQuantity() : BigDecimal.ZERO;
            item.setReceivedQuantity(shipped);
            item.setDifference(BigDecimal.ZERO);

            if (shipped.compareTo(BigDecimal.ZERO) > 0) {
                registerInboundMovement(saved, item, shipped, authentication);
            }
        }

        recordEvent(saved, TransferStatus.FULLY_RECEIVED, "Recepción completa", resolveUserId(authentication));

        return toResponse(saved);
    }

    /**
     * Card 5 — recepción parcial: registra lo que de verdad llegó por
     * ítem y calcula la diferencia (enviado - recibido) para que quede
     * disponible para reclamo. Nota honesta: el disparo de notificación de
     * faltante que menciona la tarjeta depende de la épica de Alertas
     * (sy_notifications), que todavía no está implementada — la
     * diferencia sí queda registrada y consultable, que es el criterio de
     * aceptación real de esta tarjeta.
     */
    @Transactional
    public TransferResponse receivePartial(Long transferId, TransferReceivePartialRequest request, Authentication authentication) {
        Transfer transfer = findTransferOrThrow(transferId);
        branchAccessService.assertCanWrite(authentication.getName(), transfer.getDestinationBranchId());

        if (transfer.getStatus() != TransferStatus.IN_TRANSIT) {
            throw new IllegalStateException(
                    "La transferencia " + transfer.getTransferNumber() + " no está en tránsito (actual: "
                            + transfer.getStatus() + ")");
        }

        Map<Long, TransferItem> itemsById = transfer.getItems().stream()
                .collect(Collectors.toMap(TransferItem::getId, item -> item));

        for (ReceivePartialItemRequest itemRequest : request.items()) {
            TransferItem item = itemsById.get(itemRequest.transferItemId());
            if (item == null) {
                throw new IllegalArgumentException(
                        "El ítem " + itemRequest.transferItemId() + " no pertenece a la transferencia " + transfer.getTransferNumber());
            }

            BigDecimal shipped = item.getShippedQuantity() != null ? item.getShippedQuantity() : BigDecimal.ZERO;
            if (itemRequest.receivedQuantity().compareTo(shipped) > 0) {
                throw new IllegalArgumentException("El ítem " + item.getId() + " no puede recibir más de lo enviado: "
                        + "enviado " + formatQuantity(shipped) + ", recibido " + formatQuantity(itemRequest.receivedQuantity()));
            }

            item.setReceivedQuantity(itemRequest.receivedQuantity());
            item.setDifference(shipped.subtract(itemRequest.receivedQuantity()));

            if (itemRequest.receivedQuantity().compareTo(BigDecimal.ZERO) > 0) {
                registerInboundMovement(transfer, item, itemRequest.receivedQuantity(), authentication);
            }
        }

        transfer.setActualArrivalDate(LocalDateTime.now());
        transfer.setStatus(TransferStatus.PARTIALLY_RECEIVED);
        Transfer saved = transferRepository.save(transfer);

        recordEvent(saved, TransferStatus.PARTIALLY_RECEIVED, "Recepción parcial — diferencia pendiente de reclamo",
                resolveUserId(authentication));

        return toResponse(saved);
    }

    private void registerInboundMovement(Transfer transfer, TransferItem item, BigDecimal quantity, Authentication authentication) {
        InventoryMovementRequest movementRequest = new InventoryMovementRequest(
                transfer.getDestinationBranchId(),
                item.getProduct().getId(),
                MovementType.TRANSFER_IN,
                quantity,
                null,
                "Recepción de transferencia " + transfer.getTransferNumber(),
                "TRANSFER",
                transfer.getId(),
                LocalDateTime.now());
        inventoryMovementService.register(movementRequest, authentication);
    }

    private void recordEvent(Transfer transfer, TransferStatus status, String notes, Long userId) {
        TransferEvent event = new TransferEvent();
        event.setTransfer(transfer);
        event.setStatus(status);
        event.setEventDate(LocalDateTime.now());
        event.setNotes(notes);
        event.setRecordedBy(userId);
        transferEventRepository.save(event);
    }

    private Long resolveUserId(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado: " + authentication.getName()))
                .getId();
    }

    private String generateTransferNumber() {
        int year = LocalDateTime.now().getYear();
        long sequence = transferRepository.count() + 1;
        String candidate;
        do {
            candidate = "TRF-%d-%06d".formatted(year, sequence);
            sequence++;
        } while (transferRepository.existsByTransferNumber(candidate));
        return candidate;
    }

    private String formatQuantity(BigDecimal value) {
        return value.stripTrailingZeros().toPlainString();
    }

    private TransferResponse toResponse(Transfer transfer) {
        List<TransferItemResponse> items = transfer.getItems().stream().map(TransferItemResponse::from).toList();
        return TransferResponse.from(transfer, items);
    }

    private Transfer findTransferOrThrow(Long id) {
        return transferRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Transferencia no encontrada: " + id));
    }
}
