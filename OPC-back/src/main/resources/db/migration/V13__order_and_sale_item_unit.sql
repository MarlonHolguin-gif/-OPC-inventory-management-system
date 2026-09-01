-- Cablea la conversión de unidades en Compras y Ventas: cada línea de una
-- orden de compra y de una venta puede registrarse en una unidad alternativa
-- del producto (ma_product_units). `unit_id` NULL = la unidad base del
-- producto (factor 1), que es cómo funcionaban todas las líneas hasta ahora.
-- La cantidad y el precio de la línea quedan expresados en esa unidad; el
-- movimiento de inventario los convierte a unidad base con el factor.

ALTER TABLE tr_purchase_order_items
    ADD COLUMN unit_id BIGINT UNSIGNED NULL AFTER product_id,
    ADD CONSTRAINT fk_tr_purchase_order_items_unit
        FOREIGN KEY (unit_id) REFERENCES ma_units (id)
        ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE tr_sale_items
    ADD COLUMN unit_id BIGINT UNSIGNED NULL AFTER product_id,
    ADD CONSTRAINT fk_tr_sale_items_unit
        FOREIGN KEY (unit_id) REFERENCES ma_units (id)
        ON DELETE RESTRICT ON UPDATE CASCADE;
