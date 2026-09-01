-- Paso 5 del flujo de transferencias (sección 3.4 del PDF): tras una
-- recepción parcial hay que "definir el tratamiento" del faltante — reenvío,
-- ajuste o reclamación. Se guarda la decisión en la propia transferencia.
-- Si el tratamiento es reenvío (RESHIPMENT), el backend crea una
-- transferencia de seguimiento en estado REQUESTED por las cantidades
-- faltantes y deja el enlace en reshipment_transfer_id.
ALTER TABLE tr_transfers
    ADD COLUMN shortage_resolution       ENUM('RESHIPMENT','ADJUSTMENT','CLAIM') NULL AFTER route_priority,
    ADD COLUMN shortage_resolution_notes VARCHAR(500)     NULL AFTER shortage_resolution,
    ADD COLUMN shortage_resolved_at      DATETIME         NULL AFTER shortage_resolution_notes,
    ADD COLUMN shortage_resolved_by      BIGINT UNSIGNED  NULL AFTER shortage_resolved_at,
    ADD COLUMN reshipment_transfer_id    BIGINT UNSIGNED  NULL AFTER shortage_resolved_by;

ALTER TABLE tr_transfers
    ADD CONSTRAINT fk_tr_transfers_shortage_resolved_by
        FOREIGN KEY (shortage_resolved_by) REFERENCES ma_users (id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT fk_tr_transfers_reshipment
        FOREIGN KEY (reshipment_transfer_id) REFERENCES tr_transfers (id)
        ON DELETE SET NULL ON UPDATE CASCADE;
