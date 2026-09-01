package opcback.purchases.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

@Entity
@Table(name = "tr_purchase_order_items")
@Getter
@Setter
@NoArgsConstructor
public class PurchaseOrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_order_id", nullable = false)
    private PurchaseOrder purchaseOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false, precision = 15, scale = 4)
    private BigDecimal quantity;

    @Column(name = "unit_price", nullable = false, precision = 15, scale = 4)
    private BigDecimal unitPrice;

    // Porcentaje de descuento aplicado a la línea (0-100).
    @Column(name = "discount_pct", nullable = false, precision = 7, scale = 4)
    private BigDecimal discountPercentage;

    // Monto de descuento ya calculado a partir de discountPercentage.
    @Column(nullable = false, precision = 15, scale = 4)
    private BigDecimal discount;

    @Column(nullable = false, precision = 15, scale = 4)
    private BigDecimal subtotal;
}
