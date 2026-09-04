-- Enlaza una notificación con la entidad que la originó cuando esa entidad
-- no es un producto. Hoy solo lo usa TRANSFER_SHORTAGE: guarda el id de la
-- transferencia para poder (1) borrar sus notificaciones al registrar el
-- tratamiento del faltante y (2) que el clic en la campana lleve al detalle
-- de esa transferencia. Nulo para los tipos de stock, que ya se identifican
-- por branch_id + product_id.
ALTER TABLE sy_notifications
    ADD COLUMN reference_id BIGINT UNSIGNED NULL AFTER product_id;
