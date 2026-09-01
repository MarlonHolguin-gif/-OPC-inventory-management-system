-- El descuento por línea de una orden de compra pasa de ser un monto directo
-- a un porcentaje. Se agrega discount_pct (0-100); la columna discount se
-- conserva como el monto resultante ya calculado, para que subtotal siga
-- siendo qty*unit_price - discount sin recomputar nada al leer.
-- Mismo enfoque que tr_price_list_items.discount_pct.
ALTER TABLE tr_purchase_order_items
    ADD COLUMN discount_pct DECIMAL(7,4) NOT NULL DEFAULT 0 AFTER unit_price;
