package opcback.inventory.dto;

import opcback.inventory.entity.AlertStatus;
import opcback.inventory.entity.Inventory;

import java.math.BigDecimal;

public record InventoryResponse(
        Long branchId,
        Long productId,
        String productSku,
        String productName,
        BigDecimal currentQuantity,
        BigDecimal minStock,
        BigDecimal maxStock,
        BigDecimal weightedAvgCost,
        AlertStatus alertStatus
) {
    public static InventoryResponse from(Inventory inventory, AlertStatus alertStatus) {
        return new InventoryResponse(
                inventory.getBranchId(),
                inventory.getProduct().getId(),
                inventory.getProduct().getSku(),
                inventory.getProduct().getName(),
                inventory.getCurrentQuantity(),
                inventory.getMinStock(),
                inventory.getMaxStock(),
                inventory.getWeightedAvgCost(),
                alertStatus);
    }
}
