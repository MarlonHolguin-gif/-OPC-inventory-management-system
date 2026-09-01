-- =============================================================================
-- 11-dropProductUnits.sql
-- Sistema de Inventario Multi-Sucursal — OptiPlant Consultores
--
-- Se elimina la gestión de unidades alternativas por producto y la conversión
-- entre unidades. Un producto se cuenta siempre en su unidad base
-- (ma_products.base_unit_id), sin factores: si se compran 12, se venden 12.
-- Se retira también la unidad "Caja" (CJ), que solo servía para esas
-- conversiones.
--
-- ATENCIÓN — ESTO ES UNA COPIA DE REFERENCIA, NO SE EJECUTA AUTOMÁTICAMENTE.
-- La migración real la maneja Flyway desde
-- OPC-back/src/main/resources/db/migration/V11__drop_product_units.sql.
-- =============================================================================

DROP TABLE IF EXISTS ma_product_units;

DELETE FROM ma_units
WHERE abbreviation = 'CJ'
  AND id NOT IN (SELECT base_unit_id FROM ma_products);
