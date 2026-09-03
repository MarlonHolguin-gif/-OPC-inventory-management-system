package opcback.system.audit.dto;

import opcback.system.audit.entity.AuditAction;

import java.time.LocalDateTime;

/**
 * oldValues/newValues viajan como objeto JSON real (no como un string con
 * JSON escapado) — AuditLogService los parsea antes de armar esta respuesta,
 * así el consumidor (la vista de auditoría) no tiene que hacer un JSON.parse
 * manual sobre un campo string.
 *
 * entityLabel es el nombre legible de la fila auditada — hoy "Nombre (SKU)"
 * del producto — resuelto por el backend para que la vista no muestre solo
 * el id. Nulo si el producto ya no existe y su nombre no quedó en el propio
 * registro.
 */
public record AuditLogResponse(
        Long id,
        String entity,
        Long entityId,
        String entityLabel,
        AuditAction action,
        Long userId,
        Object oldValues,
        Object newValues,
        LocalDateTime eventDate) {
}
