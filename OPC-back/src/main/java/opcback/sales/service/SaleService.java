package opcback.sales.service;

import lombok.RequiredArgsConstructor;
import opcback.auth.entity.User;
import opcback.auth.repository.UserRepository;
import opcback.exception.ResourceNotFoundException;
import opcback.inventory.dto.InventoryMovementRequest;
import opcback.inventory.entity.MovementType;
import opcback.inventory.service.InventoryMovementService;
import opcback.products.entity.Product;
import opcback.products.entity.Unit;
import opcback.products.repository.ProductRepository;
import opcback.products.repository.UnitRepository;
import opcback.products.service.ProductUnitService;
import opcback.sales.dto.SaleCreateRequest;
import opcback.sales.dto.SaleHistoryItemResponse;
import opcback.sales.dto.SaleItemRequest;
import opcback.sales.dto.SaleItemResponse;
import opcback.sales.dto.SaleResponse;
import opcback.sales.entity.Customer;
import opcback.sales.entity.PriceList;
import opcback.sales.entity.PriceListItem;
import opcback.sales.entity.Sale;
import opcback.sales.entity.SaleItem;
import opcback.sales.entity.SaleStatus;
import opcback.sales.repository.CustomerRepository;
import opcback.sales.repository.PriceListItemRepository;
import opcback.sales.repository.PriceListRepository;
import opcback.sales.repository.SaleItemRepository;
import opcback.sales.repository.SaleRepository;
import opcback.security.BranchAccessService;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.MathContext;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Registra la venta y sus ítems y, en la MISMA transacción, delega en
 * InventoryMovementService la generación del movimiento VENTA por cada
 * ítem — ese service ya valida stock suficiente y lanza
 * IllegalStateException si no lo hay, lo que revierte también la venta
 * recién guardada (nunca queda una venta sin su descuento de inventario,
 * ni un descuento de inventario sin su venta).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SaleService {

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private final SaleRepository saleRepository;
    private final SaleItemRepository saleItemRepository;
    private final PriceListRepository priceListRepository;
    private final PriceListItemRepository priceListItemRepository;
    private final CustomerRepository customerRepository;
    private final ProductRepository productRepository;
    private final UnitRepository unitRepository;
    private final UserRepository userRepository;
    private final BranchAccessService branchAccessService;
    private final InventoryMovementService inventoryMovementService;
    private final ProductUnitService productUnitService;

    public List<SaleResponse> listAll() {
        return saleRepository.findAll().stream().map(this::toResponse).toList();
    }

    public SaleResponse getById(Long id) {
        return toResponse(findSaleOrThrow(id));
    }

    public List<SaleHistoryItemResponse> history(Long branchId, Long productId, Long customerId, Long sellerId,
            LocalDateTime from, LocalDateTime to) {
        List<SaleItem> items = saleItemRepository.findHistory(branchId, productId, customerId, sellerId, from, to);

        // Nombre del responsable resuelto en bloque: /api/users es solo para
        // administradores, así que el frontend no puede resolverlo por su
        // cuenta y necesita el nombre ya incluido en cada fila.
        Map<Long, String> sellerNames = sellerNamesById(
                items.stream().map(item -> item.getSale().getSellerId()).collect(Collectors.toSet()));

        return items.stream()
                .map(item -> SaleHistoryItemResponse.from(item, sellerNames.get(item.getSale().getSellerId())))
                .toList();
    }

    @Transactional
    public SaleResponse register(SaleCreateRequest request, Authentication authentication) {
        branchAccessService.assertCanWrite(authentication.getName(), request.branchId());

        PriceList priceList = priceListRepository.findById(request.priceListId())
                .orElseThrow(() -> new ResourceNotFoundException("Lista de precios no encontrada: " + request.priceListId()));
        assertPriceListVigente(priceList);

        Customer customer = null;
        if (request.customerId() != null) {
            customer = customerRepository.findById(request.customerId())
                    .orElseThrow(() -> new ResourceNotFoundException("Cliente no encontrado: " + request.customerId()));
        }

        Long sellerId = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado: " + authentication.getName()))
                .getId();

        Sale sale = new Sale();
        sale.setBranchId(request.branchId());
        sale.setPriceList(priceList);
        sale.setSellerId(sellerId);
        sale.setCustomer(customer);
        sale.setSaleNumber(generateSaleNumber());
        sale.setSaleDate(LocalDateTime.now());
        sale.setStatus(SaleStatus.CONFIRMED);
        sale.setCreatedAt(LocalDateTime.now());

        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal totalDiscount = BigDecimal.ZERO;

        for (SaleItemRequest itemRequest : request.items()) {
            Product product = productRepository.findById(itemRequest.productId())
                    .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado: " + itemRequest.productId()));

            PriceListItem priceEntry = priceListItemRepository
                    .findByPriceListIdAndProductId(priceList.getId(), product.getId())
                    .orElseThrow(() -> new IllegalStateException("No hay precio definido para el producto "
                            + product.getName() + " en la lista " + priceList.getName()));

            // La lista de precios está por unidad base; si se vende en cajas,
            // el precio de la línea es precio_base * factor.
            BigDecimal factor = productUnitService.saleFactor(product.getId(), itemRequest.unitId());
            Unit unit = itemRequest.unitId() != null && !itemRequest.unitId().equals(product.getBaseUnit().getId())
                    ? unitRepository.findById(itemRequest.unitId())
                        .orElseThrow(() -> new ResourceNotFoundException("Unidad no encontrada: " + itemRequest.unitId()))
                    : null;

            BigDecimal discountPct = itemRequest.discountPct() != null ? itemRequest.discountPct() : BigDecimal.ZERO;
            BigDecimal unitPrice = priceEntry.getPrice().multiply(factor);
            BigDecimal gross = itemRequest.quantity().multiply(unitPrice);
            BigDecimal discountAmount = gross.multiply(discountPct).divide(HUNDRED, new MathContext(10));
            BigDecimal lineSubtotal = gross.subtract(discountAmount);

            SaleItem item = new SaleItem();
            item.setSale(sale);
            item.setProduct(product);
            item.setUnit(unit);
            item.setQuantity(itemRequest.quantity());
            item.setUnitPrice(unitPrice);
            item.setDiscountPct(discountPct);
            item.setSubtotal(lineSubtotal);
            sale.getItems().add(item);

            subtotal = subtotal.add(gross);
            totalDiscount = totalDiscount.add(discountAmount);
        }

        sale.setSubtotal(subtotal);
        sale.setTotalDiscount(totalDiscount);
        sale.setTotal(subtotal.subtract(totalDiscount));

        Sale savedSale = saleRepository.save(sale);

        for (SaleItem item : savedSale.getItems()) {
            Long unitId = item.getUnit() != null ? item.getUnit().getId() : null;
            BigDecimal baseQuantity = item.getQuantity()
                    .multiply(productUnitService.saleFactor(item.getProduct().getId(), unitId));

            InventoryMovementRequest movementRequest = new InventoryMovementRequest(
                    savedSale.getBranchId(),
                    item.getProduct().getId(),
                    MovementType.SALE,
                    baseQuantity,
                    null,
                    "Venta " + savedSale.getSaleNumber(),
                    "SALE",
                    savedSale.getId(),
                    savedSale.getSaleDate());
            inventoryMovementService.register(movementRequest, authentication);
        }

        return toResponse(savedSale);
    }

    private void assertPriceListVigente(PriceList priceList) {
        LocalDate today = LocalDate.now();
        boolean withinRange = (priceList.getStartDate() == null || !today.isBefore(priceList.getStartDate()))
                && (priceList.getEndDate() == null || !today.isAfter(priceList.getEndDate()));
        if (!priceList.isActive() || !withinRange) {
            throw new IllegalStateException("La lista de precios " + priceList.getName() + " no está vigente");
        }
    }

    private String generateSaleNumber() {
        int year = LocalDateTime.now().getYear();
        long sequence = saleRepository.count() + 1;
        String candidate;
        do {
            candidate = "VT-%d-%06d".formatted(year, sequence);
            sequence++;
        } while (saleRepository.existsBySaleNumber(candidate));
        return candidate;
    }

    private SaleResponse toResponse(Sale sale) {
        List<SaleItemResponse> items = sale.getItems().stream().map(SaleItemResponse::from).toList();
        String sellerName = userRepository.findById(sale.getSellerId()).map(User::getName).orElse(null);
        return SaleResponse.from(sale, sellerName, items);
    }

    private Map<Long, String> sellerNamesById(Set<Long> sellerIds) {
        if (sellerIds.isEmpty()) {
            return Map.of();
        }
        return userRepository.findAllById(sellerIds).stream()
                .collect(Collectors.toMap(User::getId, User::getName));
    }

    private Sale findSaleOrThrow(Long id) {
        return saleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Venta no encontrada: " + id));
    }
}
