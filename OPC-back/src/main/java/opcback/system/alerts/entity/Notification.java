package opcback.system.alerts.entity;

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

import java.time.LocalDateTime;

@Entity
@Table(name = "sy_notifications")
@Getter
@Setter
@NoArgsConstructor
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationType type;

    @Column(name = "branch_id", nullable = false)
    private Long branchId;

    /**
     * Nulo si la notificación no está atada a un producto puntual — hoy
     * los 3 tipos (LOW_STOCK, HIGH_STOCK, TRANSFER_SHORTAGE) siempre traen
     * uno, pero el esquema lo deja opcional a propósito.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    private Product product;

    /**
     * Id de la entidad que originó la notificación cuando no es un producto
     * — hoy solo la transferencia de un TRANSFER_SHORTAGE. Sirve para
     * borrar sus notificaciones al tratar el faltante y para que el clic en
     * la campana lleve al detalle de esa transferencia. Nulo para los tipos
     * de stock (se identifican por branch_id + product_id).
     */
    @Column(name = "reference_id")
    private Long referenceId;

    @Column(nullable = false, length = 255)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationChannel channel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationStatus status;

    /**
     * Nulo a propósito para los tipos que ya emite este proyecto: son
     * alertas de sucursal (quien la gestiona la ve), no de un usuario
     * puntual — ver NotificationService/NotificationController, que
     * filtran por sucursales asignadas, no por este campo.
     */
    @Column(name = "recipient_user_id")
    private Long recipientUserId;

    @Column(name = "generated_at", nullable = false)
    private LocalDateTime generatedAt;

    @Column(name = "read_at")
    private LocalDateTime readAt;
}
