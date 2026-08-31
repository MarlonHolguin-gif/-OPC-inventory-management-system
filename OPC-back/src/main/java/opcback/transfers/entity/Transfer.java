package opcback.transfers.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import opcback.system.audit.Auditable;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "tr_transfers")
@Getter
@Setter
@NoArgsConstructor
public class Transfer implements Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "transfer_number", nullable = false, unique = true, length = 50)
    private String transferNumber;

    @Column(name = "origin_branch_id", nullable = false)
    private Long originBranchId;

    @Column(name = "destination_branch_id", nullable = false)
    private Long destinationBranchId;

    @Column(name = "requested_by", nullable = false)
    private Long requestedBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TransferStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TransferUrgency urgency;

    @Enumerated(EnumType.STRING)
    @Column(name = "route_priority", nullable = false)
    private TransferRoutePriority routePriority;

    @Column(length = 150)
    private String carrier;

    @Column(name = "shipping_cost", precision = 15, scale = 4)
    private BigDecimal shippingCost;

    @Column(name = "request_date", nullable = false)
    private LocalDateTime requestDate;

    @Column(name = "estimated_dispatch_date")
    private LocalDateTime estimatedDispatchDate;

    @Column(name = "actual_dispatch_date")
    private LocalDateTime actualDispatchDate;

    @Column(name = "estimated_arrival_date")
    private LocalDateTime estimatedArrivalDate;

    @Column(name = "actual_arrival_date")
    private LocalDateTime actualArrivalDate;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "transfer", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<TransferItem> items = new ArrayList<>();
}
