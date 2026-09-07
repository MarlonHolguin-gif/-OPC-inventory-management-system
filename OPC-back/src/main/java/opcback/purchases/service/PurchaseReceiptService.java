package opcback.purchases.service;

import lombok.RequiredArgsConstructor;
import opcback.auth.repository.UserRepository;
import opcback.exception.ResourceNotFoundException;
import opcback.inventory.dto.InventoryMovementRequest;
import opcback.inventory.entity.MovementType;
import opcback.inventory.service.InventoryMovementService;
import opcback.products.service.ProductUnitService;
import opcback.purchases.dto.PurchaseReceiptCreateRequest;
import opcback.purchases.dto.PurchaseReceiptResponse;
import opcback.purchases.entity.PurchaseOrder;
import opcback.purchases.entity.PurchaseOrderItem;
import opcback.purchases.entity.PurchaseOrderStatus;
import opcback.purchases.entity.PurchaseReceipt;
import opcback.purchases.entity.PurchaseReceiptItem;
import opcback.purchases.entity.ReceiptType;
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

/**
 * Registra la recepción de una orden de compra. La recepción es siempre
 * total: se recibe todo lo que quede pendiente y la orden pasa a
 * FULLY_RECEIVED (o no se recibe nada y se cancela). Crea RECEPCIONES_COMPRA
 * + sus ítems y reutiliza InventoryMovementService para generar los
 * movimientos de inventario tipo PURCHASE — que ya recalcula
 * current_quantity y weighted_avg_cost atómicamente.
 */
@Service
@RequiredArgsConstructor
public class PurchaseReceiptService {

    private final PurchaseOrderRepository purchaseOrderRepository;
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
        receipt.setReceiptType(ReceiptType.FULL);

        // Recepción total: se recibe todo lo que quede pendiente de cada línea.
        for (PurchaseOrderItem orderItem : order.getItems()) {
            BigDecimal alreadyReceived = purchaseReceiptItemRepository.sumReceivedByPurchaseOrderItemId(orderItem.getId());
            BigDecimal remaining = orderItem.getQuantity().subtract(alreadyReceived);
            if (remaining.signum() <= 0) {
                continue;
            }
            PurchaseReceiptItem receiptItem = new PurchaseReceiptItem();
            receiptItem.setReceipt(receipt);
            receiptItem.setPurchaseOrderItem(orderItem);
            receiptItem.setReceivedQuantity(remaining);
            receipt.getItems().add(receiptItem);
        }

        if (receipt.getItems().isEmpty()) {
            throw new IllegalStateException(
                    "La orden " + order.getOrderNumber() + " no tiene mercancía pendiente por recibir.");
        }

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

        order.setStatus(PurchaseOrderStatus.FULLY_RECEIVED);
        purchaseOrderRepository.save(order);
        // Orden recibida por completo -> se borra la notificación de flujo.
        notificationService.reconcilePurchaseOrderNotification(order);

        return new PurchaseReceiptResponse(savedReceipt.getId(), order.getId(), order.getOrderNumber(),
                savedReceipt.getReceiptType(), savedReceipt.getReceiptDate(), savedReceipt.getNotes(), order.getStatus());
    }
}
