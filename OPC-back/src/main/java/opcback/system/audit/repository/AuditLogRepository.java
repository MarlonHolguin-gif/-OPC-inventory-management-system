package opcback.system.audit.repository;

import opcback.system.audit.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

/**
 * JpaSpecificationExecutor porque el endpoint de consulta (GET /api/auditoria)
 * combina 4 filtros independientes y opcionales (entidad, entidad_id,
 * usuario, rango de fechas) — Specifications evita construir a mano el
 * producto cartesiano de queries derivadas para cada combinación posible.
 */
public interface AuditLogRepository extends JpaRepository<AuditLog, Long>, JpaSpecificationExecutor<AuditLog> {
}
