-- =============================================================================
-- 06-auditLogNullableUser.sql
-- Sistema de Inventario Multi-Sucursal — OptiPlant Consultores
--
-- sy_audit_log.user_id pasa a admitir NULL: un intento de login fallido con
-- un email que no corresponde a ningún usuario no tiene un user_id real que
-- asociarle, y aun así el criterio de aceptación de "Registro de eventos de
-- autenticación" exige que quede registrado internamente. La FK
-- fk_sy_audit_log_user (ON DELETE RESTRICT) sigue intacta: MySQL no valida
-- una FK contra un valor NULL.
--
-- ATENCIÓN — ESTO ES UNA COPIA DE REFERENCIA, NO SE EJECUTA AUTOMÁTICAMENTE.
-- La migración real la maneja Flyway desde
-- OPC-back/src/main/resources/db/migration/V6__audit_log_nullable_user.sql.
-- =============================================================================

ALTER TABLE sy_audit_log
    MODIFY COLUMN user_id BIGINT UNSIGNED NULL;
