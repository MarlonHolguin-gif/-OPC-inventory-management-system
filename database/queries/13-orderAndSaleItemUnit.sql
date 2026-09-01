-- =============================================================================
-- 13-orderAndSaleItemUnit.sql
-- Sistema de Inventario Multi-Sucursal — OptiPlant Consultores
--
-- Cablea la conversión de unidades en Compras y Ventas: cada línea de una orden
-- de compra y de una venta puede registrarse en una unidad alternativa del
-- producto (ma_product_units). `unit_id` NULL = unidad base (factor 1). La
-- cantidad/precio de la línea quedan en esa unidad; el movimiento de inventario
-- los convierte a unidad base con el factor.
--
-- ATENCIÓN — ESTO ES UNA COPIA DE REFERENCIA, NO SE EJECUTA AUTOMÁTICAMENTE.
-- La migración real la maneja Flyway desde
-- OPC-back/src/main/resources/db/migration/V13__order_and_sale_item_unit.sql.
-- =============================================================================

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
