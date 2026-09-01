-- =============================================================================
-- 10-auditLogProductsOnly.sql
-- Sistema de Inventario Multi-Sucursal — OptiPlant Consultores
--
-- La auditoría genérica (sy_audit_log) se reduce a su mínimo: solo el catálogo
-- de productos. Es lo que pide la sección 3.1 del PDF — "registro de cada
-- acción sobre el inventario: quién lo hizo, cuándo y por qué". Las demás
-- entidades que se auditaban (usuarios, listas de precios, órdenes de compra)
-- quedan fuera de alcance por decisión del proyecto.
--
-- ATENCIÓN — ESTO ES UNA COPIA DE REFERENCIA, NO SE EJECUTA AUTOMÁTICAMENTE.
-- La migración real la maneja Flyway desde
-- OPC-back/src/main/resources/db/migration/V10__audit_log_products_only.sql.
-- =============================================================================

DELETE FROM sy_audit_log WHERE entity <> 'Product';
