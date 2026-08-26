package opcback.purchases.service;

import lombok.RequiredArgsConstructor;
import opcback.auth.repository.UserRepository;
import opcback.exception.ResourceNotFoundException;
import opcback.products.entity.Product;
import opcback.products.repository.ProductRepository;
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
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
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
    private final UserRepository userRepository;
    private final BranchAccessService branchAccessService;

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
     * Estado inicial: toda orden se crea en BORRADOR (DRAFT), igual que el
     * default de tr_purchase_orders.status en el DDL. Pasar a ENVIADA
     * (SENT) es una acción explícita separada (no está en el alcance de
     * esta tarjeta, que solo cubre la creación).
     */
    @Transactional
    public PurchaseOrderResponse create(PurchaseOrderCreateRequest request, Authentication authentication) {
        branchAccessService.assertCanWrite(authentication.getName(), request.branchId());

        Supplier supplier = supplierRepository.findById(request.supplierId())
                .orElseThrow(() -> new ResourceNotFoundException("Proveedor no encontrado: " + request.supplierId()));

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

        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal totalDiscount = BigDecimal.ZERO;

        for (PurchaseOrderItemRequest itemRequest : request.items()) {
            Product product = productRepository.findById(itemRequest.productId())
                    .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado: " + itemRequest.productId()));

            BigDecimal discount = itemRequest.discount() != null ? itemRequest.discount() : BigDecimal.ZERO;
            BigDecimal lineSubtotal = itemRequest.quantity().multiply(itemRequest.unitPrice()).subtract(discount);

            PurchaseOrderItem item = new PurchaseOrderItem();
            item.setPurchaseOrder(order);
            item.setProduct(product);
            item.setQuantity(itemRequest.quantity());
            item.setUnitPrice(itemRequest.unitPrice());
            item.setDiscount(discount);
            item.setSubtotal(lineSubtotal);
            order.getItems().add(item);

            subtotal = subtotal.add(itemRequest.quantity().multiply(itemRequest.unitPrice()));
            totalDiscount = totalDiscount.add(discount);
        }

        order.setSubtotal(subtotal);
        order.setTotalDiscount(totalDiscount);
        order.setTotal(subtotal.subtract(totalDiscount));

        PurchaseOrder saved = purchaseOrderRepository.save(order);
        return toResponse(saved);
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
