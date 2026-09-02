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
import opcback.system.alerts.service.NotificationService;
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
import opcback.transfers.dto.TransferShortageResolutionRequest;
import opcback.transfers.entity.ShortageResolution;
import opcback.transfers.entity.Transfer;
import opcback.transfers.entity.TransferEvent;
import opcback.transfers.entity.TransferItem;
import opcback.transfers.entity.TransferRoutePriority;
import opcback.transfers.entity.TransferStatus;
import opcback.transfers.repository.TransferEventRepository;
import opcback.transfers.repository.TransferRepository;
import org.springframework.security.access.AccessDeniedException;
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
    private final NotificationService notificationService;

    /**
     * ADMIN_GENERAL ve todas las transferencias; el resto solo las que
     * involucran alguna de sus sucursales asignadas (como origen o destino).
     * Mismo criterio de lectura por sucursal que usa el listado de
     * notificaciones.
     */
    public List<TransferResponse> listAll(TransferRoutePriority routePriority, Authentication authentication) {
        String email = authentication.getName();
        List<Transfer> transfers;
        if (branchAccessService.isGeneralAdmin(email)) {
            transfers = transferRepository.findAllFiltered(routePriority);
        } else {
            List<Long> ownBranchIds = branchAccessService.getWritableBranchIds(email);
            transfers = ownBranchIds.isEmpty()
                    ? List.of()
                    : transferRepository.findForBranches(routePriority, ownBranchIds);
        }
        return transfers.stream().map(this::toResponse).toList();
    }

    /**
     * Una transferencia solo la puede consultar ADMIN_GENERAL o una sucursal
     * que participe en ella (origen o destino) — mismo criterio que el
     * listado.
     */
    private void assertCanView(String email, Transfer transfer) {
        if (branchAccessService.isGeneralAdmin(email)) {
            return;
        }
        List<Long> ownBranchIds = branchAccessService.getWritableBranchIds(email);
        if (!ownBranchIds.contains(transfer.getOriginBranchId())
                && !ownBranchIds.contains(transfer.getDestinationBranchId())) {
            throw new AccessDeniedException("No tiene acceso a la transferencia " + transfer.getTransferNumber());
        }
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

    public TransferResponse getById(Long id, Authentication authentication) {
        Transfer transfer = findTransferOrThrow(id);
        assertCanView(authentication.getName(), transfer);
        return toResponse(transfer);
    }

    public List<TransferEventResponse> events(Long transferId, Authentication authentication) {
        assertCanView(authentication.getName(), findTransferOrThrow(transferId));
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

            // El inventario es compartido y visible entre sucursales: no tiene
            // sentido solicitar una transferencia de algo que la sucursal de
            // origen no tiene. Se valida ya en la solicitud (además de en la
            // preparación, donde el stock pudo cambiar).
            BigDecimal available = inventoryRepository
                    .findByBranchIdAndProductId(request.originBranchId(), product.getId())
                    .map(inv -> inv.getCurrentQuantity())
                    .orElse(BigDecimal.ZERO);
            if (itemRequest.quantity().compareTo(available) > 0) {
                throw new IllegalStateException("La sucursal de origen no tiene existencias suficientes de «"
                        + product.getName() + "»: disponible " + formatQuantity(available)
                        + ", solicitado " + formatQuantity(itemRequest.quantity()));
            }

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

        transfer.setEstimatedDispatchDate(request.estimatedDispatchDate());
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
     * disponible para reclamo, y dispara una notificación
     * TRANSFERENCIA_FALTANTE por cada ítem con diferencia real (épica de
     * Alertas, ver NotificationService.notifyTransferShortage).
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

            // Card 3 — notificación de faltante, una por ítem con
            // diferencia real (no se dispara si llegó todo lo enviado).
            notificationService.notifyTransferShortage(transfer, item);
        }

        transfer.setActualArrivalDate(LocalDateTime.now());
        transfer.setStatus(TransferStatus.PARTIALLY_RECEIVED);
        Transfer saved = transferRepository.save(transfer);

        recordEvent(saved, TransferStatus.PARTIALLY_RECEIVED, "Recepción parcial — diferencia pendiente de reclamo",
                resolveUserId(authentication));

        return toResponse(saved);
    }

    /**
     * Paso 5 (cierre) — define el tratamiento del faltante de una recepción
     * parcial: reenvío, ajuste o reclamación. Lo decide la sucursal destino
     * (la que recibió de menos). Si el tratamiento es reenvío, se genera
     * automáticamente una transferencia de seguimiento en estado SOLICITADA
     * por las cantidades faltantes (mismo origen y destino) y se guarda el
     * enlace en reshipment_transfer_id.
     */
    @Transactional
    public TransferResponse resolveShortage(
            Long transferId, TransferShortageResolutionRequest request, Authentication authentication) {
        Transfer transfer = findTransferOrThrow(transferId);
        branchAccessService.assertCanWrite(authentication.getName(), transfer.getDestinationBranchId());

        if (transfer.getStatus() != TransferStatus.PARTIALLY_RECEIVED) {
            throw new IllegalStateException("La transferencia " + transfer.getTransferNumber()
                    + " no está en recepción parcial (estado actual: " + transfer.getStatus() + ")");
        }
        if (transfer.getShortageResolution() != null) {
            throw new IllegalStateException("El faltante de la transferencia " + transfer.getTransferNumber()
                    + " ya tiene un tratamiento registrado (" + transfer.getShortageResolution() + ")");
        }

        List<TransferItem> itemsWithShortage = transfer.getItems().stream()
                .filter(item -> item.getDifference() != null && item.getDifference().compareTo(BigDecimal.ZERO) > 0)
                .toList();
        if (itemsWithShortage.isEmpty()) {
            throw new IllegalStateException(
                    "La transferencia " + transfer.getTransferNumber() + " no tiene faltantes que tratar");
        }

        Long userId = resolveUserId(authentication);
        transfer.setShortageResolution(request.resolution());
        transfer.setShortageResolutionNotes(request.notes());
        transfer.setShortageResolvedAt(LocalDateTime.now());
        transfer.setShortageResolvedBy(userId);

        String eventNote;
        if (request.resolution() == ShortageResolution.RESHIPMENT) {
            Transfer reshipment = createReshipment(transfer, itemsWithShortage, userId);
            transfer.setReshipmentTransferId(reshipment.getId());
            eventNote = "Faltante tratado con reenvío — nueva transferencia " + reshipment.getTransferNumber();
        } else {
            eventNote = "Faltante tratado: " + resolutionLabel(request.resolution());
        }
        if (request.notes() != null && !request.notes().isBlank()) {
            eventNote += " — " + request.notes();
        }

        Transfer saved = transferRepository.save(transfer);
        recordEvent(saved, saved.getStatus(), eventNote, userId);

        return toResponse(saved);
    }

    private Transfer createReshipment(Transfer original, List<TransferItem> itemsWithShortage, Long userId) {
        Transfer reshipment = new Transfer();
        reshipment.setOriginBranchId(original.getOriginBranchId());
        reshipment.setDestinationBranchId(original.getDestinationBranchId());
        reshipment.setRequestedBy(userId);
        reshipment.setStatus(TransferStatus.REQUESTED);
        reshipment.setUrgency(original.getUrgency());
        reshipment.setRoutePriority(TransferRoutePriority.MEDIUM);
        reshipment.setRequestDate(LocalDateTime.now());
        reshipment.setCreatedAt(LocalDateTime.now());
        reshipment.setTransferNumber(generateTransferNumber());

        for (TransferItem shortItem : itemsWithShortage) {
            TransferItem item = new TransferItem();
            item.setTransfer(reshipment);
            item.setProduct(shortItem.getProduct());
            item.setRequestedQuantity(shortItem.getDifference());
            reshipment.getItems().add(item);
        }

        Transfer saved = transferRepository.save(reshipment);
        recordEvent(saved, TransferStatus.REQUESTED,
                "Solicitud creada por reenvío del faltante de " + original.getTransferNumber(), userId);
        return saved;
    }

    private static String resolutionLabel(ShortageResolution resolution) {
        return switch (resolution) {
            case RESHIPMENT -> "reenvío";
            case ADJUSTMENT -> "ajuste";
            case CLAIM -> "reclamación";
        };
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
