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
    ON tr_inventory_movements (movement_date);

CREATE INDEX idx_tr_inventory_movements_branch_product
    ON tr_inventory_movements (branch_id, product_id);

CREATE INDEX idx_tr_sales_date
    ON tr_sales (sale_date);

CREATE INDEX idx_tr_purchase_orders_date
    ON tr_purchase_orders (order_date);

-- Consulta típica: historial de auditoría de un registro puntual
-- (WHERE entity = '...' AND entity_id = ...). No es UNIQUE: un mismo
-- registro auditado acumula muchas filas de auditoría en el tiempo.
CREATE INDEX idx_sy_audit_log_entity
    ON sy_audit_log (entity, entity_id);
