package opcback.system.audit.dto;

import opcback.system.audit.entity.AuditAction;

import java.time.LocalDateTime;

/**
 * oldValues/newValues viajan como objeto JSON real (no como un string con
 * JSON escapado) — AuditLogService los parsea antes de armar esta respuesta,
 * así el consumidor (la futura vista de auditoría, tarjeta aparte) no tiene
 * que hacer un JSON.parse manual sobre un campo string.
 */
public record AuditLogResponse(
        Long id,
        String entity,
        Long entityId,
        AuditAction action,
        Long userId,
        Object oldValues,
        Object newValues,
        LocalDateTime eventDate) {
}
