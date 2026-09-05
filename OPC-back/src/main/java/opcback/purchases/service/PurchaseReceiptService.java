package opcback.purchases.service;

import lombok.RequiredArgsConstructor;
import opcback.auth.repository.UserRepository;
import opcback.exception.ResourceNotFoundException;
import opcback.inventory.dto.InventoryMovementRequest;
import opcback.inventory.entity.MovementType;
import opcback.inventory.service.InventoryMovementService;
import opcback.products.service.ProductUnitService;
import opcback.purchases.dto.PurchaseReceiptCreateRequest;
import opcback.purchases.dto.PurchaseReceiptItemRequest;
import opcback.purchases.dto.PurchaseReceiptResponse;
import opcback.purchases.entity.PurchaseOrder;
import opcback.purchases.entity.PurchaseOrderItem;
import opcback.purchases.entity.PurchaseOrderStatus;
import opcback.purchases.entity.PurchaseReceipt;
import opcback.purchases.entity.PurchaseReceiptItem;
import opcback.purchases.entity.ReceiptType;
import opcback.purchases.repository.PurchaseOrderItemRepository;
import opcback.purchases.repository.PurchaseOrderRepository;
import opcback.purchases.repository.PurchaseReceiptItemRepository;
import opcback.purchases.repository.PurchaseReceiptRepository;
import opcback.security.BranchAccessService;
import opcback.system.alerts.service.NotificationService;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.MathContext;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Registra una recepción (total o parcial) de una orden de compra: crea
 * RECEPCIONES_COMPRA + sus ítems, actualiza el estado de la orden, y
 * reutiliza InventoryMovementService para generar los movimientos de
 * inventario tipo PURCHASE — que ya recalcula current_quantity y
 * weighted_avg_cost atómicamente (ver InventoryMovementService).
 */
@Service
@RequiredArgsConstructor
public class PurchaseReceiptService {

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PurchaseOrderItemRepository purchaseOrderItemRepository;
    private final PurchaseReceiptRepository purchaseReceiptRepository;
    private final PurchaseReceiptItemRepository purchaseReceiptItemRepository;
    private final UserRepository userRepository;
    private final BranchAccessService branchAccessService;
    private final InventoryMovementService inventoryMovementService;
    private final ProductUnitService productUnitService;
    private final NotificationService notificationService;

    @Transactional
    public PurchaseReceiptResponse register(Long orderId, PurchaseReceiptCreateRequest request, Authentication authentication) {
        PurchaseOrder order = purchaseOrderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Orden de compra no encontrada: " + orderId));

        branchAccessService.assertCanWrite(authentication.getName(), order.getBranchId());

        if (order.getStatus() == PurchaseOrderStatus.DRAFT) {
            throw new IllegalStateException("La orden " + order.getOrderNumber() + " todavía está en borrador; "
                    + "envíala al proveedor antes de registrar una recepción de mercancía.");
        }
        if (order.getStatus() == PurchaseOrderStatus.CANCELLED || order.getStatus() == PurchaseOrderStatus.FULLY_RECEIVED) {
            throw new IllegalStateException(
                    "La orden " + order.getOrderNumber() + " no admite más recepciones (estado: " + order.getStatus() + ")");
        }

        Long responsibleUserId = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado: " + authentication.getName()))
                .getId();

        PurchaseReceipt receipt = new PurchaseReceipt();
        receipt.setPurchaseOrder(order);
        receipt.setUserId(responsibleUserId);
        receipt.setReceiptDate(LocalDateTime.now());
        receipt.setNotes(request.notes());

        Map<Long, BigDecimal> requestedByOrderItemId = new LinkedHashMap<>();

        for (PurchaseReceiptItemRequest itemRequest : request.items()) {
            PurchaseOrderItem orderItem = purchaseOrderItemRepository.findById(itemRequest.purchaseOrderItemId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Ítem de orden no encontrado: " + itemRequest.purchaseOrderItemId()));

            if (!orderItem.getPurchaseOrder().getId().equals(order.getId())) {
                throw new IllegalArgumentException(
                        "El ítem " + orderItem.getId() + " no pertenece a la orden " + order.getOrderNumber());
            }

            // Ninguna recepción (ni la suma de varias) puede exceder lo pedido.
            BigDecimal alreadyReceived = purchaseReceiptItemRepository.sumReceivedByPurchaseOrderItemId(orderItem.getId());
            BigDecimal remaining = orderItem.getQuantity().subtract(alreadyReceived);
            if (itemRequest.receivedQuantity().compareTo(remaining) > 0) {
                throw new IllegalStateException("El ítem " + orderItem.getId() + " excede lo pendiente por recibir: "
                        + "pendiente " + remaining + ", solicitado " + itemRequest.receivedQuantity());
            }

            PurchaseReceiptItem receiptItem = new PurchaseReceiptItem();
            receiptItem.setReceipt(receipt);
            receiptItem.setPurchaseOrderItem(orderItem);
            receiptItem.setReceivedQuantity(itemRequest.receivedQuantity());
            receipt.getItems().add(receiptItem);

            requestedByOrderItemId.merge(orderItem.getId(), itemRequest.receivedQuantity(), BigDecimal::add);
        }

        boolean fullyReceived = isOrderFullyReceivedAfter(order, requestedByOrderItemId);
        receipt.setReceiptType(fullyReceived ? ReceiptType.FULL : ReceiptType.PARTIAL);

        PurchaseReceipt savedReceipt = purchaseReceiptRepository.save(receipt);

        for (PurchaseReceiptItem receiptItem : savedReceipt.getItems()) {
            PurchaseOrderItem orderItem = receiptItem.getPurchaseOrderItem();

            // La línea de la orden puede estar en cajas; el inventario se lleva
            // en unidad base -> se convierte la cantidad y se prorratea el costo.
            Long unitId = orderItem.getUnit() != null ? orderItem.getUnit().getId() : null;
            BigDecimal factor = productUnitService.purchaseFactor(orderItem.getProduct().getId(), unitId);
            BigDecimal baseQuantity = receiptItem.getReceivedQuantity().multiply(factor);
            BigDecimal baseUnitCost = orderItem.getUnitPrice().divide(factor, new MathContext(10));

            InventoryMovementRequest movementRequest = new InventoryMovementRequest(
                    order.getBranchId(),
                    orderItem.getProduct().getId(),
                    MovementType.PURCHASE,
                    baseQuantity,
                    baseUnitCost,
                    "Recepción de orden de compra " + order.getOrderNumber(),
                    "PURCHASE_RECEIPT",
                    savedReceipt.getId(),
                    savedReceipt.getReceiptDate());
            inventoryMovementService.register(movementRequest, authentication);
        }

        order.setStatus(fullyReceived ? PurchaseOrderStatus.FULLY_RECEIVED : PurchaseOrderStatus.PARTIALLY_RECEIVED);
        purchaseOrderRepository.save(order);
        // Recepción completa -> se borra la notificación; parcial -> sigue.
        notificationService.reconcilePurchaseOrderNotification(order);

        return new PurchaseReceiptResponse(savedReceipt.getId(), order.getId(), order.getOrderNumber(),
                savedReceipt.getReceiptType(), savedReceipt.getReceiptDate(), savedReceipt.getNotes(), order.getStatus());
    }

    private boolean isOrderFullyReceivedAfter(PurchaseOrder order, Map<Long, BigDecimal> requestedByOrderItemId) {
        for (PurchaseOrderItem item : order.getItems()) {
            BigDecimal alreadyReceived = purchaseReceiptItemRepository.sumReceivedByPurchaseOrderItemId(item.getId());
            BigDecimal thisReceipt = requestedByOrderItemId.getOrDefault(item.getId(), BigDecimal.ZERO);
            if (alreadyReceived.add(thisReceipt).compareTo(item.getQuantity()) < 0) {
                return false;
            }
        }
        return true;
    }
}
