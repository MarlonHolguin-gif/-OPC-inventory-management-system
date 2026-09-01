-- Se elimina la gestión de unidades alternativas por producto y la conversión
-- entre unidades. Un producto se cuenta siempre en su unidad base
-- (ma_products.base_unit_id), sin factores: si se compran 12, se venden 12.
-- ma_product_units solo es el hijo de dos FKs (a ma_products y ma_units),
-- ninguna tabla la referencia, así que se puede soltar directamente.
DROP TABLE IF EXISTS ma_product_units;

-- La unidad "Caja" (CJ) solo servía para esas conversiones. Se borra si ya
-- no la usa ningún producto como unidad base.
DELETE FROM ma_units
WHERE abbreviation = 'CJ'
  AND id NOT IN (SELECT base_unit_id FROM ma_products);
