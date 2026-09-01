-- =============================================================================
-- 09-auditLogDropLogin.sql
-- Sistema de Inventario Multi-Sucursal — OptiPlant Consultores
--
-- La auditoría genérica (sy_audit_log) se acota: deja de registrar los inicios
-- de sesión y los cambios sobre transferencias. La trazabilidad de
-- transferencias ya la da tr_transfer_events; el registro de inicios de sesión
-- se retira por decisión de alcance. sy_audit_log queda enfocado en
-- altas/ediciones/bajas de productos, listas de precios, usuarios y órdenes de
-- compra.
--
-- ATENCIÓN — ESTO ES UNA COPIA DE REFERENCIA, NO SE EJECUTA AUTOMÁTICAMENTE.
-- La migración real la maneja Flyway desde
-- OPC-back/src/main/resources/db/migration/V9__audit_log_drop_login.sql.
-- =============================================================================

DELETE FROM sy_audit_log WHERE entity IN ('Auth', 'Transfer');

ALTER TABLE sy_audit_log
    MODIFY COLUMN action ENUM('CREATE', 'UPDATE', 'DELETE') NOT NULL;
