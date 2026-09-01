-- =============================================================================
-- 07-purchaseOrderItemDiscountPct.sql
-- Sistema de Inventario Multi-Sucursal — OptiPlant Consultores
--
-- El descuento por línea de una orden de compra pasa de ser un monto directo
-- a un porcentaje. Se agrega discount_pct (0-100); la columna discount se
-- conserva como el monto resultante ya calculado, para que subtotal siga
-- siendo qty*unit_price - discount sin recomputar nada al leer.
-- Mismo enfoque que tr_price_list_items.discount_pct.
--
-- ATENCIÓN — ESTO ES UNA COPIA DE REFERENCIA, NO SE EJECUTA AUTOMÁTICAMENTE.
-- La migración real la maneja Flyway desde
-- OPC-back/src/main/resources/db/migration/V7__purchase_order_item_discount_pct.sql.
-- =============================================================================

ALTER TABLE tr_purchase_order_items
    ADD COLUMN discount_pct DECIMAL(7,4) NOT NULL DEFAULT 0 AFTER unit_price;
