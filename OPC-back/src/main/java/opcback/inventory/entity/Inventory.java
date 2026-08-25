package opcback.inventory.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import opcback.products.entity.Product;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "tr_inventory")
@Getter
@Setter
@NoArgsConstructor
public class Inventory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "branch_id", nullable = false)
    private Long branchId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    /**
     * Sin setter directo a propósito: current_quantity solo se modifica
     * vía applyMovement(), que es lo único que InventoryMovementService
     * usa. No agregar un setCurrentQuantity() — si otro módulo necesita
     * tocar el stock, tiene que pasar por InventoryMovementService.
     */
    @Setter(AccessLevel.NONE)
    @Column(name = "current_quantity", nullable = false, precision = 15, scale = 4)
    private BigDecimal currentQuantity;

    @Column(name = "min_stock", nullable = false, precision = 15, scale = 4)
    private BigDecimal minStock;

    @Column(name = "max_stock", nullable = false, precision = 15, scale = 4)
    private BigDecimal maxStock;

    @Column(name = "weighted_avg_cost", nullable = false, precision = 15, scale = 4)
    private BigDecimal weightedAvgCost;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public void initializeQuantity(BigDecimal initialQuantity) {
        this.currentQuantity = initialQuantity;
    }

    public void applyMovement(BigDecimal delta) {
        this.currentQuantity = this.currentQuantity.add(delta);
    }
}
