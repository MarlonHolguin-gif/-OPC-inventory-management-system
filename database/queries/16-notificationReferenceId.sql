-- Copia de referencia de la migración Flyway V16 (ver
-- OPC-back/src/main/resources/db/migration). No la ejecuta la aplicación;
-- está aquí para tener el SQL del proyecto en un solo lugar.

-- Enlaza una notificación con la entidad que la originó cuando esa entidad
-- no es un producto. Hoy solo lo usa TRANSFER_SHORTAGE: guarda el id de la
-- transferencia para borrar sus notificaciones al tratar el faltante y para
-- que el clic en la campana lleve al detalle de esa transferencia.
ALTER TABLE sy_notifications
    ADD COLUMN reference_id BIGINT UNSIGNED NULL AFTER product_id;
