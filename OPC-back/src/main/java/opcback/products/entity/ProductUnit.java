package opcback.products.entity;

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

import java.math.BigDecimal;

/**
 * conversion_factor: cuántas unidades BASE del producto (ma_products.base_unit_id)
 * equivalen a 1 de esta unidad. Ej.: base = "unidad", esta fila unit = "caja",
 * conversion_factor = 12 -> 1 caja = 12 unidades.
 */
@Entity
@Table(name = "ma_product_units")
@Getter
@Setter
@NoArgsConstructor
public class ProductUnit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unit_id", nullable = false)
    private Unit unit;

    @Column(name = "conversion_factor", nullable = false, precision = 15, scale = 4)
    private BigDecimal conversionFactor;

    @Column(name = "is_purchase_unit", nullable = false)
    private boolean purchaseUnit;

    @Column(name = "is_sale_unit", nullable = false)
    private boolean saleUnit;
}
