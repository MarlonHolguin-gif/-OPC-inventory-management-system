-- =============================================================================
-- 03-indexes.sql
-- Sistema de Inventario Multi-Sucursal — OptiPlant Consultores
--
-- Índices adicionales recomendados en requirements/Analisis_Requerimientos.md
-- sección 9.5, para las consultas de dashboard y reportes por rango de fecha.
-- Los índices simples sobre columnas FK ya los crea InnoDB automáticamente al
-- agregar cada FOREIGN KEY en 02-addForeignKeys.sql — estos son adicionales
-- (por fecha, y un compuesto que ninguna FK individual cubre).
-- =============================================================================

CREATE INDEX idx_tr_inventory_movements_date
    ON TR_INVENTORY_MOVEMENTS (movement_date);

CREATE INDEX idx_tr_inventory_movements_branch_product
    ON TR_INVENTORY_MOVEMENTS (branch_id, product_id);

CREATE INDEX idx_tr_sales_date
    ON TR_SALES (sale_date);

CREATE INDEX idx_tr_purchase_orders_date
    ON TR_PURCHASE_ORDERS (order_date);
