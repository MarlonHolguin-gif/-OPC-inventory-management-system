-- =============================================================================
-- 12-recreateProductUnits.sql
-- Sistema de Inventario Multi-Sucursal — OptiPlant Consultores
--
-- Reversión de 11-dropProductUnits.sql: se vuelve a introducir la gestión de
-- múltiples unidades de medida por producto (comprar en cajas, vender en
-- unidades) con factor de conversión — requisito explícito del enunciado
-- (sección 3.1). Se recrea la tabla con la misma definición de 01/02, se
-- repone la unidad "Caja" y los datos de demostración.
--
-- ATENCIÓN — ESTO ES UNA COPIA DE REFERENCIA, NO SE EJECUTA AUTOMÁTICAMENTE.
-- La migración real la maneja Flyway desde
-- OPC-back/src/main/resources/db/migration/V12__recreate_product_units.sql.
-- =============================================================================

CREATE TABLE ma_product_units (
    id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id         BIGINT UNSIGNED NOT NULL,
    unit_id            BIGINT UNSIGNED NOT NULL,
    conversion_factor  DECIMAL(15,4) NOT NULL,
    is_purchase_unit   BOOLEAN NOT NULL DEFAULT FALSE,
    is_sale_unit       BOOLEAN NOT NULL DEFAULT FALSE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

ALTER TABLE ma_product_units
    ADD CONSTRAINT fk_ma_product_units_product
        FOREIGN KEY (product_id) REFERENCES ma_products (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT fk_ma_product_units_unit
        FOREIGN KEY (unit_id) REFERENCES ma_units (id)
        ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO ma_units (name, abbreviation)
SELECT 'Caja', 'CJ'
WHERE NOT EXISTS (SELECT 1 FROM ma_units WHERE abbreviation = 'CJ');

INSERT INTO ma_product_units (product_id, unit_id, conversion_factor, is_purchase_unit, is_sale_unit)
SELECT p.id, u.id, x.factor, x.is_purchase, x.is_sale
FROM (
    SELECT 'BEB-001' AS sku, 'UN' AS abbr, 1  AS factor, FALSE AS is_purchase, TRUE  AS is_sale
    UNION ALL SELECT 'BEB-001', 'CJ', 24, TRUE,  FALSE
    UNION ALL SELECT 'ASE-001', 'UN', 1,  FALSE, TRUE
    UNION ALL SELECT 'ASE-001', 'CJ', 12, TRUE,  FALSE
) x
JOIN ma_products p ON p.sku = x.sku
JOIN ma_units u ON u.abbreviation = x.abbr
WHERE NOT EXISTS (
    SELECT 1 FROM ma_product_units mpu WHERE mpu.product_id = p.id AND mpu.unit_id = u.id
);
