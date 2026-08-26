-- =============================================================================
-- 05-addSupplierTaxIdUnique.sql
-- Sistema de Inventario Multi-Sucursal — OptiPlant Consultores
--
-- ma_suppliers.tax_id debe ser único cuando esté presente. MySQL permite
-- múltiples NULL en una columna UNIQUE (NULL <> NULL), así que esta misma
-- restricción ya cubre "único solo si está presente" sin lógica adicional.
--
-- ATENCIÓN — ESTO ES UNA COPIA DE REFERENCIA, NO SE EJECUTA AUTOMÁTICAMENTE.
-- La migración real la maneja Flyway desde
-- OPC-back/src/main/resources/db/migration/V5__add_supplier_tax_id_unique.sql.
-- =============================================================================

ALTER TABLE ma_suppliers
    ADD CONSTRAINT uq_ma_suppliers_tax_id UNIQUE (tax_id);
