-- Nuevo tipo de notificación: OUT_OF_STOCK. Se genera al crear un producto
-- para cada sucursal activa que quede sin existencias de él (sin fila en
-- tr_inventory) — así el gerente/administrador ve de una qué productos hay
-- sin stock, sin esperar a que un movimiento cruce el mínimo (con min_stock
-- en 0, la regla de "stock bajo" ni siquiera se activa).

ALTER TABLE sy_notifications
    MODIFY COLUMN type ENUM('LOW_STOCK','HIGH_STOCK','TRANSFER_SHORTAGE','OUT_OF_STOCK') NOT NULL;
