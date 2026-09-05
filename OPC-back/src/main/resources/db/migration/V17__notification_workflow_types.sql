-- Notificaciones de flujo de trabajo, además de las de stock:
--   TRANSFER_PENDING       una transferencia que espera una acción (preparar,
--                          despachar, recibir, o tratar su faltante). El
--                          reference_id guarda el id de la transferencia.
--   PURCHASE_ORDER_PENDING una orden de compra que espera una acción (enviar
--                          al proveedor, o registrar la recepción). El
--                          reference_id guarda el id de la orden.
-- Ambas siguen el mismo modelo de reconciliación que las de stock: una sola
-- notificación por entidad, cuyo branch_id / mensaje cambian con el estado y
-- que se borra al llegar a un estado terminal. Solo las ven el gerente de la
-- sucursal y el administrador general (el operador de inventario no).
ALTER TABLE sy_notifications
    MODIFY COLUMN type ENUM(
        'LOW_STOCK','HIGH_STOCK','TRANSFER_SHORTAGE','OUT_OF_STOCK',
        'TRANSFER_PENDING','PURCHASE_ORDER_PENDING'
    ) NOT NULL;
