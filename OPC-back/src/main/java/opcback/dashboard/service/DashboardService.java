package opcback.dashboard.service;

import lombok.RequiredArgsConstructor;
import opcback.branches.entity.Branch;
import opcback.branches.repository.BranchRepository;
import opcback.dashboard.dto.ActiveTransfersImpactResponse;
import opcback.dashboard.dto.BranchComparisonRow;
import opcback.dashboard.dto.MonthlySalesPoint;
import opcback.dashboard.dto.ProductRotationRow;
import opcback.dashboard.dto.TransferImpactRow;
import opcback.inventory.dto.InventoryResponse;
import opcback.inventory.entity.AlertStatus;
import opcback.inventory.entity.InventoryMovement;
import opcback.inventory.entity.Inventory;
import opcback.inventory.entity.MovementType;
import opcback.inventory.repository.InventoryMovementRepository;
import opcback.inventory.repository.InventoryRepository;
import opcback.inventory.service.InventoryService;
import opcback.products.entity.Product;
import opcback.sales.entity.Sale;
import opcback.sales.entity.SaleStatus;
import opcback.sales.repository.SaleRepository;
import opcback.transfers.entity.Transfer;
import opcback.transfers.entity.TransferItem;
import opcback.transfers.entity.TransferStatus;
import opcback.transfers.repository.TransferRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Épica de Dashboard / KPIs operativos. Todo de solo lectura, agregando
 * sobre datos que ya escriben Ventas, Movimientos de Inventario y
 * Transferencias — este servicio no crea ni modifica nada, solo lee y
 * agrupa (mismo estilo que TransferService.complianceReport: trae filas
 * planas con una query simple y agrupa/agrega en Java con streams).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardService {

    /**
     * Card 3 — "excluye transferencias RECIBIDA_COMPLETA y CANCELADA":
     * criterio de aceptación explícito, aplicado tanto al detalle por
     * sucursal como a la comparativa entre sucursales.
     */
    private static final Set<TransferStatus> EXCLUDED_TRANSFER_STATUSES =
            EnumSet.of(TransferStatus.FULLY_RECEIVED, TransferStatus.CANCELLED);

    private final SaleRepository saleRepository;
    private final InventoryMovementRepository inventoryMovementRepository;
    private final InventoryRepository inventoryRepository;
    private final TransferRepository transferRepository;
    private final InventoryService inventoryService;
    private final BranchRepository branchRepository;

    /**
     * Card 1 — mes en curso contra los 3 anteriores (4 puntos), filtrado
     * por sucursal. Devuelve los 4 meses siempre, incluso en $0, para que
     * la serie temporal no tenga huecos al graficarla.
     */
    public List<MonthlySalesPoint> salesTrend(Long branchId) {
        YearMonth currentMonth = YearMonth.now();
        YearMonth startMonth = currentMonth.minusMonths(3);
        LocalDateTime from = startMonth.atDay(1).atStartOfDay();
        LocalDateTime to = currentMonth.atEndOfMonth().atTime(LocalTime.MAX);

        Map<YearMonth, BigDecimal> totalsByMonth = saleRepository
                .findByOptionalBranchAndStatusAndDateRange(branchId, SaleStatus.CONFIRMED, from, to).stream()
                .collect(Collectors.groupingBy(
                        sale -> YearMonth.from(sale.getSaleDate()),
                        Collectors.reducing(BigDecimal.ZERO, Sale::getTotal, BigDecimal::add)));

        List<MonthlySalesPoint> points = new ArrayList<>();
        for (int monthsAgo = 3; monthsAgo >= 0; monthsAgo--) {
            YearMonth month = currentMonth.minusMonths(monthsAgo);
            points.add(new MonthlySalesPoint(month.toString(), totalsByMonth.getOrDefault(month, BigDecimal.ZERO)));
        }
        return points;
    }

    /**
     * Card 2 — rotación por producto (suma de cantidad vendida) en un rango
     * de fechas, filtrada por sucursal. Incluye TODOS los productos activos
     * con inventario en la sucursal, no solo los que se vendieron: los de
     * rotación 0 son justamente los de "baja demanda" que el enunciado pide
     * poder ver. ascending=false (default) ordena de mayor a menor rotación
     * (alta demanda arriba); ascending=true muestra primero la baja demanda.
     */
    public List<ProductRotationRow> inventoryRotation(Long branchId, LocalDateTime from, LocalDateTime to, boolean ascending) {
        Map<Long, List<InventoryMovement>> movementsByProduct = inventoryMovementRepository
                .findByOptionalBranchAndTypeAndDateRange(branchId, MovementType.SALE, from, to).stream()
                .collect(Collectors.groupingBy(movement -> movement.getProduct().getId()));

        // Universo de productos: los que tienen inventario en la sucursal +
        // (por si acaso) los que se movieron sin fila de inventario. Solo activos.
        Map<Long, Product> productsById = new LinkedHashMap<>();
        inventoryRepository.findByBranchId(branchId).stream()
                .map(Inventory::getProduct)
                .filter(Product::isActive)
                .forEach(product -> productsById.putIfAbsent(product.getId(), product));
        movementsByProduct.values().forEach(movements -> {
            Product product = movements.get(0).getProduct();
            if (product.isActive()) {
                productsById.putIfAbsent(product.getId(), product);
            }
        });

        Comparator<ProductRotationRow> comparator = Comparator
                .comparing(ProductRotationRow::quantitySold)
                .thenComparing(ProductRotationRow::productSku);
        if (!ascending) {
            comparator = comparator.reversed();
        }

        return productsById.values().stream()
                .map(product -> {
                    List<InventoryMovement> movements = movementsByProduct.getOrDefault(product.getId(), List.of());
                    BigDecimal quantitySold = movements.stream()
                            .map(InventoryMovement::getQuantity)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    return new ProductRotationRow(
                            product.getId(), product.getSku(), product.getName(), quantitySold, movements.size());
                })
                .sorted(comparator)
                .toList();
    }

    /**
     * Card 3 — transferencias activas que involucran la sucursal (como
     * origen o destino) y su efecto proyectado por producto.
     */
    public ActiveTransfersImpactResponse activeTransfersImpact(Long branchId) {
        List<Transfer> transfers = transferRepository.findActiveInvolvingBranch(branchId, EXCLUDED_TRANSFER_STATUSES);

        long asOrigin = transfers.stream().filter(t -> t.getOriginBranchId().equals(branchId)).count();
        long asDestination = transfers.stream().filter(t -> t.getDestinationBranchId().equals(branchId)).count();

        // "Estado de las transferencias activas": cuántas hay en cada fase,
        // en el orden natural del flujo (ordinal del enum).
        List<ActiveTransfersImpactResponse.StatusCount> statusBreakdown = transfers.stream()
                .collect(Collectors.groupingBy(Transfer::getStatus, Collectors.counting()))
                .entrySet().stream()
                .map(entry -> new ActiveTransfersImpactResponse.StatusCount(entry.getKey(), entry.getValue()))
                .sorted(Comparator.comparingInt(statusCount -> statusCount.status().ordinal()))
                .toList();

        Map<Long, Product> productsById = new LinkedHashMap<>();
        Map<Long, BigDecimal> outboundByProduct = new LinkedHashMap<>();
        Map<Long, BigDecimal> inboundByProduct = new LinkedHashMap<>();

        for (Transfer transfer : transfers) {
            boolean isOrigin = transfer.getOriginBranchId().equals(branchId);
            boolean isDestination = transfer.getDestinationBranchId().equals(branchId);
            for (TransferItem item : transfer.getItems()) {
                BigDecimal pending = pendingQuantity(transfer, item);
                Long productId = item.getProduct().getId();
                productsById.putIfAbsent(productId, item.getProduct());
                if (isOrigin) {
                    outboundByProduct.merge(productId, pending, BigDecimal::add);
                }
                if (isDestination) {
                    inboundByProduct.merge(productId, pending, BigDecimal::add);
                }
            }
        }

        List<TransferImpactRow> rows = productsById.values().stream()
                .map(product -> new TransferImpactRow(
                        product.getId(),
                        product.getSku(),
                        product.getName(),
                        outboundByProduct.getOrDefault(product.getId(), BigDecimal.ZERO),
                        inboundByProduct.getOrDefault(product.getId(), BigDecimal.ZERO)))
                .sorted(Comparator.comparing(TransferImpactRow::productSku))
                .toList();

        return new ActiveTransfersImpactResponse(asOrigin, asDestination, statusBreakdown, rows);
    }

    /**
     * Cuánto de este ítem todavía "está en el aire" para la transferencia:
     * ya despachado (shippedQuantity) si existe, si no lo solicitado
     * (requestedQuantity, antes de preparar/despachar); en recepción
     * parcial, solo el faltante (enviado - recibido) sigue pendiente — lo
     * ya recibido dejó de ser una proyección.
     */
    private BigDecimal pendingQuantity(Transfer transfer, TransferItem item) {
        if (transfer.getStatus() == TransferStatus.PARTIALLY_RECEIVED) {
            BigDecimal shipped = item.getShippedQuantity() != null ? item.getShippedQuantity() : BigDecimal.ZERO;
            BigDecimal received = item.getReceivedQuantity() != null ? item.getReceivedQuantity() : BigDecimal.ZERO;
            return shipped.subtract(received);
        }
        if (item.getShippedQuantity() != null) {
            return item.getShippedQuantity();
        }
        return item.getRequestedQuantity();
    }

    /**
     * Card 4 — reusa InventoryService.listAlertsByBranch (Card 4: "mismo
     * criterio que Alertas Inteligentes, sin duplicar lógica") y se queda
     * solo con LOW_STOCK — "próximos a agotarse", no con exceso de stock.
     */
    public List<InventoryResponse> lowStockProducts(Long branchId) {
        return inventoryService.listAlertsByBranch(branchId).stream()
                .filter(response -> response.alertStatus() == AlertStatus.LOW_STOCK)
                .toList();
    }

    /**
     * Card 5 — las mismas métricas de arriba, una fila por sucursal en vez
     * de filtradas a una. Solo accesible a ADMIN_GENERAL (@PreAuthorize en
     * el controller).
     */
    public List<BranchComparisonRow> branchComparison() {
        List<Branch> branches = branchRepository.findAll();

        YearMonth currentMonth = YearMonth.now();
        LocalDateTime from = currentMonth.atDay(1).atStartOfDay();
        LocalDateTime to = currentMonth.atEndOfMonth().atTime(LocalTime.MAX);

        Map<Long, BigDecimal> salesByBranch = saleRepository
                .findByOptionalBranchAndStatusAndDateRange(null, SaleStatus.CONFIRMED, from, to).stream()
                .collect(Collectors.groupingBy(Sale::getBranchId, Collectors.reducing(BigDecimal.ZERO, Sale::getTotal, BigDecimal::add)));

        Map<Long, Long> lowStockByBranch = new LinkedHashMap<>();
        for (Branch branch : branches) {
            long count = lowStockProducts(branch.getId()).size();
            lowStockByBranch.put(branch.getId(), count);
        }

        List<Transfer> activeTransfers = transferRepository.findActiveInvolvingBranch(null, EXCLUDED_TRANSFER_STATUSES);
        Map<Long, Long> originCounts = activeTransfers.stream()
                .collect(Collectors.groupingBy(Transfer::getOriginBranchId, Collectors.counting()));
        Map<Long, Long> destinationCounts = activeTransfers.stream()
                .collect(Collectors.groupingBy(Transfer::getDestinationBranchId, Collectors.counting()));

        return branches.stream()
                .map(branch -> new BranchComparisonRow(
                        branch.getId(),
                        branch.getName(),
                        salesByBranch.getOrDefault(branch.getId(), BigDecimal.ZERO),
                        lowStockByBranch.getOrDefault(branch.getId(), 0L),
                        originCounts.getOrDefault(branch.getId(), 0L),
                        destinationCounts.getOrDefault(branch.getId(), 0L)))
                .sorted(Comparator.comparing(BranchComparisonRow::branchName))
                .toList();
    }
}
