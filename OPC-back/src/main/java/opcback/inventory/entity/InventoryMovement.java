package opcback.inventory.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import opcback.products.entity.Product;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "tr_inventory_movements")
@Getter
@Setter
@NoArgsConstructor
public class InventoryMovement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "branch_id", nullable = false)
    private Long branchId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Enumerated(EnumType.STRING)
    @Column(name = "movement_type", nullable = false)
    private MovementType movementType;

    @Column(nullable = false, precision = 15, scale = 4)
    private BigDecimal quantity;

    @Column(name = "unit_cost", nullable = false, precision = 15, scale = 4)
    private BigDecimal unitCost;

    @Column(nullable = false, length = 100)
    private String reason;

    @Column(name = "responsible_user_id", nullable = false)
    private Long responsibleUserId;

    @Column(name = "reference_type", nullable = false, length = 40)
    private String referenceType;

    @Column(name = "reference_id", nullable = false)
    private Long referenceId;

    @Column(name = "movement_date", nullable = false)
    private LocalDateTime movementDate;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
