-- La auditoría genérica (sy_audit_log) se acota: deja de registrar los
-- inicios de sesión y los cambios sobre transferencias. Motivos:
--   * la trazabilidad de transferencias ya la da tr_transfer_events (historial
--     de estados) — auditarla otra vez en sy_audit_log era duplicar;
--   * el registro de inicios de sesión se retira por decisión de alcance.
-- sy_audit_log queda enfocado en altas/ediciones/bajas de las entidades clave
-- de configuración: productos, listas de precios, usuarios y órdenes de compra.

-- 1. Borra las filas ya registradas de esos dos orígenes (entity = 'Auth' son
--    los eventos de login; entity = 'Transfer' los cambios de transferencias).
DELETE FROM sy_audit_log WHERE entity IN ('Auth', 'Transfer');

-- 2. Quita LOGIN del dominio de la columna action.
ALTER TABLE sy_audit_log
    MODIFY COLUMN action ENUM('CREATE', 'UPDATE', 'DELETE') NOT NULL;
