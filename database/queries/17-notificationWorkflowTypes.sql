-- Copia de referencia de la migración Flyway V17 (ver
-- OPC-back/src/main/resources/db/migration). No la ejecuta la aplicación;
-- está aquí para tener el SQL del proyecto en un solo lugar.

-- Dos tipos nuevos de notificación de flujo de trabajo:
--   TRANSFER_PENDING       transferencia que espera una acción; reference_id
--                          = id de la transferencia.
--   PURCHASE_ORDER_PENDING orden de compra que espera una acción;
--                          reference_id = id de la orden.
-- Siguen el mismo modelo de reconciliación que las de stock. Solo las ven
-- el gerente de la sucursal y el administrador general.
ALTER TABLE sy_notifications
    MODIFY COLUMN type ENUM(
        'LOW_STOCK','HIGH_STOCK','TRANSFER_SHORTAGE','OUT_OF_STOCK',
        'TRANSFER_PENDING','PURCHASE_ORDER_PENDING'
    ) NOT NULL;
