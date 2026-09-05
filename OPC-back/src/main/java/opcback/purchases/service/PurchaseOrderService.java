package opcback.purchases.service;

import lombok.RequiredArgsConstructor;
import opcback.auth.repository.UserRepository;
import opcback.exception.ResourceNotFoundException;
import opcback.products.entity.Product;
import opcback.products.entity.Unit;
import opcback.products.repository.ProductRepository;
import opcback.products.repository.UnitRepository;
import opcback.products.service.ProductUnitService;
import opcback.purchases.dto.PurchaseHistoryItemResponse;
import opcback.purchases.dto.PurchaseOrderCreateRequest;
import opcback.purchases.dto.PurchaseOrderItemRequest;
import opcback.purchases.dto.PurchaseOrderItemResponse;
import opcback.purchases.dto.PurchaseOrderResponse;
import opcback.purchases.entity.PurchaseOrder;
import opcback.purchases.entity.PurchaseOrderItem;
import opcback.purchases.entity.PurchaseOrderStatus;
import opcback.purchases.entity.Supplier;
import opcback.purchases.repository.PurchaseOrderItemRepository;
import opcback.purchases.repository.PurchaseOrderRepository;
import opcback.purchases.repository.PurchaseReceiptItemRepository;
import opcback.purchases.repository.SupplierRepository;
import opcback.security.BranchAccessService;
import opcback.system.alerts.service.NotificationService;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PurchaseOrderService {

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PurchaseOrderItemRepository purchaseOrderItemRepository;
    private final PurchaseReceiptItemRepository purchaseReceiptItemRepository;
    private final SupplierRepository supplierRepository;
    private final ProductRepository productRepository;
    private final UnitRepository unitRepository;
    private final UserRepository userRepository;
    private final BranchAccessService branchAccessService;
    private final ProductUnitService productUnitService;
    private final NotificationService notificationService;

    public List<PurchaseOrderResponse> listAll() {
        return purchaseOrderRepository.findAll().stream().map(this::toResponse).toList();
    }

    public PurchaseOrderResponse getById(Long id) {
        return toResponse(findOrderOrThrow(id));
    }

    public List<PurchaseHistoryItemResponse> history(Long supplierId, Long productId, LocalDateTime from, LocalDateTime to) {
        return purchaseOrderItemRepository.findHistory(supplierId, productId, from, to).stream()
                .map(PurchaseHistoryItemResponse::from)
                .toList();
    }

    /**
     * Estado inicial: toda orden se crea en borrador (DRAFT), igual que el
     * valor por defecto de tr_purchase_orders.status en el DDL. Enviarla al
     * proveedor (markAsSent) y cancelarla (cancel) son acciones explícitas
     * separadas.
     */
    @Transactional
    public PurchaseOrderResponse create(PurchaseOrderCreateRequest request, Authentication authentication) {
        branchAccessService.assertCanWrite(authentication.getName(), request.branchId());
        assertNoRepeatedProducts(request.items());

        Supplier supplier = findSupplierOrThrow(request.supplierId());

        Long responsibleUserId = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado: " + authentication.getName()))
                .getId();

        PurchaseOrder order = new PurchaseOrder();
        order.setSupplier(supplier);
        order.setBranchId(request.branchId());
        order.setUserId(responsibleUserId);
        order.setPaymentTerms(request.paymentTerms());
        order.setStatus(PurchaseOrderStatus.DRAFT);
        order.setOrderDate(LocalDateTime.now());
        order.setCreatedAt(LocalDateTime.now());
        order.setOrderNumber(generateOrderNumber());

        applyItemsAndRecalculateTotals(order, request.items());

        PurchaseOrder saved = purchaseOrderRepository.save(order);
        notificationService.reconcilePurchaseOrderNotification(saved);
        return toResponse(saved);
    }

    /**
     * Editar una orden solo se permite mientras está en borrador — una vez
     * enviada al proveedor o con recepciones registradas, cambiar cantidades
     * o precios dejaría el inventario y el histórico inconsistentes.
     * Reemplaza por completo la lista de ítems (orphanRemoval borra los que
     * ya no vienen) y recalcula los totales.
     */
    @Transactional
    public PurchaseOrderResponse update(Long id, PurchaseOrderCreateRequest request, Authentication authentication) {
        PurchaseOrder order = findOrderOrThrow(id);
        branchAccessService.assertCanWrite(authentication.getName(), order.getBranchId());
        branchAccessService.assertCanWrite(authentication.getName(), request.branchId());

        if (order.getStatus() != PurchaseOrderStatus.DRAFT) {
            throw new IllegalStateException("Solo se puede editar una orden de compra que está en borrador. "
                    + "Estado actual de " + order.getOrderNumber() + ": " + order.getStatus());
        }
        assertNoRepeatedProducts(request.items());

        order.setSupplier(findSupplierOrThrow(request.supplierId()));
        order.setBranchId(request.branchId());
        order.setPaymentTerms(request.paymentTerms());

        order.getItems().clear();
        applyItemsAndRecalculateTotals(order, request.items());

        PurchaseOrder saved = purchaseOrderRepository.save(order);
        // La sucursal de la orden pudo cambiar: la notificación la sigue.
        notificationService.reconcilePurchaseOrderNotification(saved);
        return toResponse(saved);
    }

    /**
     * Borrador -> Enviada al proveedor. A partir de este estado la orden ya
     * no se puede editar, pero sí recibir mercancía.
     */
    @Transactional
    public PurchaseOrderResponse markAsSent(Long id, Authentication authentication) {
        PurchaseOrder order = findOrderOrThrow(id);
        branchAccessService.assertCanWrite(authentication.getName(), order.getBranchId());

        if (order.getStatus() != PurchaseOrderStatus.DRAFT) {
            throw new IllegalStateException("Solo se puede enviar al proveedor una orden que está en borrador. "
                    + "Estado actual de " + order.getOrderNumber() + ": " + order.getStatus());
        }

        order.setStatus(PurchaseOrderStatus.SENT);
        PurchaseOrder saved = purchaseOrderRepository.save(order);
        notificationService.reconcilePurchaseOrderNotification(saved);
        return toResponse(saved);
    }

    /**
     * Cancela la orden mientras no esté completamente recibida ni ya
     * cancelada. Si tiene recepciones parciales, las entradas de inventario
     * que ya se hicieron NO se revierten — la cancelación solo impide
     * recepciones futuras.
     */
    @Transactional
    public PurchaseOrderResponse cancel(Long id, Authentication authentication) {
        PurchaseOrder order = findOrderOrThrow(id);
        branchAccessService.assertCanWrite(authentication.getName(), order.getBranchId());

        if (order.getStatus() == PurchaseOrderStatus.FULLY_RECEIVED
                || order.getStatus() == PurchaseOrderStatus.CANCELLED) {
            throw new IllegalStateException("No se puede cancelar la orden " + order.getOrderNumber()
                    + " porque está en estado " + order.getStatus() + ".");
        }

        order.setStatus(PurchaseOrderStatus.CANCELLED);
        PurchaseOrder saved = purchaseOrderRepository.save(order);
        notificationService.reconcilePurchaseOrderNotification(saved);
        return toResponse(saved);
    }

    private static final BigDecimal ONE_HUNDRED = new BigDecimal("100");

    /**
     * Registra los ítems de la orden (cantidad, precio unitario, porcentaje de
     * descuento y subtotal por línea) y recalcula subtotal, descuento total y
     * total. El descuento se recibe como porcentaje y se guarda tanto el
     * porcentaje como el monto que resulta de aplicarlo.
     */
    // Un producto va una sola vez por orden (aplica al alta y a la edición
    // del borrador). Se valida antes de tocar la BD.
    private void assertNoRepeatedProducts(List<PurchaseOrderItemRequest> itemRequests) {
        long distinctProducts = itemRequests.stream().map(PurchaseOrderItemRequest::productId).distinct().count();
        if (distinctProducts != itemRequests.size()) {
            throw new IllegalArgumentException("Una orden de compra no puede repetir el mismo producto en varias líneas");
        }
    }

    private void applyItemsAndRecalculateTotals(PurchaseOrder order, List<PurchaseOrderItemRequest> itemRequests) {
        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal totalDiscount = BigDecimal.ZERO;

        for (PurchaseOrderItemRequest itemRequest : itemRequests) {
            Product product = productRepository.findById(itemRequest.productId())
                    .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado: " + itemRequest.productId()));

            // Valida que la unidad elegida sea de compra para el producto (o la base).
            productUnitService.purchaseFactor(product.getId(), itemRequest.unitId());
            Unit unit = itemRequest.unitId() != null && !itemRequest.unitId().equals(product.getBaseUnit().getId())
                    ? unitRepository.findById(itemRequest.unitId())
                        .orElseThrow(() -> new ResourceNotFoundException("Unidad no encontrada: " + itemRequest.unitId()))
                    : null;

            BigDecimal lineGross = itemRequest.quantity().multiply(itemRequest.unitPrice());
            BigDecimal discountPercentage = itemRequest.discountPercentage() != null
                    ? itemRequest.discountPercentage() : BigDecimal.ZERO;
            BigDecimal discountAmount = lineGross.multiply(discountPercentage)
                    .divide(ONE_HUNDRED, 4, RoundingMode.HALF_UP);

            PurchaseOrderItem item = new PurchaseOrderItem();
            item.setPurchaseOrder(order);
            item.setProduct(product);
            item.setUnit(unit);
            item.setQuantity(itemRequest.quantity());
            item.setUnitPrice(itemRequest.unitPrice());
            item.setDiscountPercentage(discountPercentage);
            item.setDiscount(discountAmount);
            item.setSubtotal(lineGross.subtract(discountAmount));
            order.getItems().add(item);

            subtotal = subtotal.add(lineGross);
            totalDiscount = totalDiscount.add(discountAmount);
        }

        order.setSubtotal(subtotal);
        order.setTotalDiscount(totalDiscount);
        order.setTotal(subtotal.subtract(totalDiscount));
    }

    private Supplier findSupplierOrThrow(Long supplierId) {
        return supplierRepository.findById(supplierId)
                .orElseThrow(() -> new ResourceNotFoundException("Proveedor no encontrado: " + supplierId));
    }

    private String generateOrderNumber() {
        int year = LocalDateTime.now().getYear();
        long sequence = purchaseOrderRepository.count() + 1;
        String candidate;
        do {
            candidate = "OC-%d-%06d".formatted(year, sequence);
            sequence++;
        } while (purchaseOrderRepository.existsByOrderNumber(candidate));
        return candidate;
    }

    private PurchaseOrderResponse toResponse(PurchaseOrder order) {
        List<PurchaseOrderItemResponse> items = order.getItems().stream()
                .map(item -> PurchaseOrderItemResponse.from(item,
                        purchaseReceiptItemRepository.sumReceivedByPurchaseOrderItemId(item.getId())))
                .toList();
        return PurchaseOrderResponse.from(order, items);
    }

    PurchaseOrder findOrderOrThrow(Long id) {
        return purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Orden de compra no encontrada: " + id));
    }
}
