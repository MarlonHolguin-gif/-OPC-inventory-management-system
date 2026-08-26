-- ma_suppliers.tax_id debe ser único cuando esté presente. MySQL permite
-- múltiples NULL en una columna UNIQUE (NULL <> NULL), así que esta misma
-- restricción ya cubre "único solo si está presente" sin lógica adicional.
ALTER TABLE ma_suppliers
    ADD CONSTRAINT uq_ma_suppliers_tax_id UNIQUE (tax_id);
