package opcback.transfers.entity;

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

import java.time.LocalDateTime;

/**
 * Una fila por cada cambio de estado de una transferencia — el historial
 * completo debe poder reconstruirse solo a partir de esta tabla (criterio
 * de aceptación de la tarjeta "Registro automático en
 * TRANSFERENCIAS_EVENTOS"), así que TransferService la escribe al final de
 * cada transición, nunca se deja como un paso opcional.
 */
@Entity
@Table(name = "tr_transfer_events")
@Getter
@Setter
@NoArgsConstructor
public class TransferEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transfer_id", nullable = false)
    private Transfer transfer;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TransferStatus status;

    @Column(name = "event_date", nullable = false)
    private LocalDateTime eventDate;

    @Column(length = 500)
    private String notes;

    @Column(name = "recorded_by", nullable = false)
    private Long recordedBy;
}
