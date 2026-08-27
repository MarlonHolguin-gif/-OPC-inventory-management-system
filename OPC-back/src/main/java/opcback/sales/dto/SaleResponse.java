package opcback.sales.dto;

import opcback.sales.entity.Sale;
import opcback.sales.entity.SaleStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record SaleResponse(
        Long id,
        String saleNumber,
        Long branchId,
        Long priceListId,
        Long sellerId,
        Long customerId,
        String customerName,
        LocalDateTime saleDate,
        BigDecimal subtotal,
        BigDecimal totalDiscount,
        BigDecimal total,
        SaleStatus status,
        List<SaleItemResponse> items
) {
    public static SaleResponse from(Sale sale, List<SaleItemResponse> items) {
        return new SaleResponse(
                sale.getId(),
                sale.getSaleNumber(),
                sale.getBranchId(),
                sale.getPriceList().getId(),
                sale.getSellerId(),
                sale.getCustomer() != null ? sale.getCustomer().getId() : null,
                sale.getCustomer() != null ? sale.getCustomer().getName() : null,
                sale.getSaleDate(),
                sale.getSubtotal(),
                sale.getTotalDiscount(),
                sale.getTotal(),
                sale.getStatus(),
                items);
    }
}
