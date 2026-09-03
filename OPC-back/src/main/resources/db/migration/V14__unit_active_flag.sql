-- Las unidades de medida ganan borrado lógico, igual que categorías y
-- productos: hasta ahora ma_units solo se podía crear/editar/listar. El
-- frontend ya trae botones "Desactivar"/"Reactivar" para unidades.
--
-- La unicidad de nombre (categorías) y de nombre + abreviatura (unidades)
-- NO se añade como índice único aquí: se valida en la capa de servicio
-- (CategoryService / UnitService) porque una base ya en uso puede tener
-- duplicados creados antes de esta regla, y el índice fallaría al aplicarse.
-- El borrado físico de categorías/unidades queda disponible para limpiarlos.

ALTER TABLE ma_units
    ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE AFTER abbreviation;
