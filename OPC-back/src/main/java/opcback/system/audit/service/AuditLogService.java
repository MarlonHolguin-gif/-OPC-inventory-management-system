package opcback.system.audit.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import opcback.system.audit.dto.AuditLogResponse;
import opcback.system.audit.entity.AuditAction;
import opcback.system.audit.entity.AuditLog;
import opcback.system.audit.repository.AuditLogRepository;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.Map;

/**
 * Escribe en sy_audit_log por JDBC directo (JdbcTemplate), no por el
 * EntityManager/repositorio JPA. Motivo: {@link AuditEntityListener} llama a
 * record(...) DESDE un listener de Hibernate (onPostInsert/onPostUpdate/
 * onPostDelete) que se dispara EN MEDIO del flush de la sesión que originó
 * el cambio auditado — hacer entityManager.persist(...)/repository.save(...)
 * ahí reentra esa misma sesión mientras Hibernate la está iterando, lo cual
 * es sabidamente frágil (ConcurrentModificationException o el insert nunca
 * llega a flushear). Un INSERT por JDBC plano no toca el persistence
 * context: usa la misma conexión/transacción física (vía
 * DataSourceTransactionManager), así que igual queda atómico con el cambio
 * que lo originó, pero sin reentrar la sesión de Hibernate.
 *
 * record(...) NO declara @Transactional propia: corre dentro de la
 * transacción de negocio que originó el cambio (la del flush de Hibernate
 * que disparó el listener) a propósito — si esa transacción hace rollback,
 * el registro de auditoría de ese cambio también debe desaparecer, no
 * tendría sentido auditar un cambio que nunca ocurrió.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuditLogService {

    private static final String INSERT_SQL = """
            INSERT INTO sy_audit_log (entity, entity_id, action, user_id, old_values, new_values, event_date)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """;

    private static final String FIND_USER_ID_BY_EMAIL_SQL = "SELECT id FROM ma_users WHERE email = ?";

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final AuditLogRepository auditLogRepository;

    /**
     * Nunca propaga una excepción hacia quien la llama: un fallo al
     * registrar auditoría (ej. un problema pasajero de serialización JSON)
     * no debe tumbar la operación de negocio que la originó — un
     * alta/edición/baja de producto, usuario, lista de precios u orden de
     * compra.
     */
    public void record(String entity, long entityId, AuditAction action, Long userId,
                        Map<String, Object> oldValues, Map<String, Object> newValues) {
        try {
            jdbcTemplate.update(INSERT_SQL,
                    entity,
                    entityId,
                    action.name(),
                    userId,
                    toJson(oldValues),
                    toJson(newValues),
                    Timestamp.valueOf(LocalDateTime.now()));
        } catch (Exception ex) {
            log.warn("No se pudo registrar el evento de auditoría ({} {} #{}): {}", action, entity, entityId,
                    ex.getMessage());
        }
    }

    /**
     * El JWT solo lleva el email como subject — resuelve el id numérico
     * para user_id. Por JDBC directo y no por UserRepository (JPA) a
     * propósito: {@link AuditEntityListener} llama a esto DESDE el mismo
     * listener de Hibernate que dispara record(...), en medio del flush de
     * la sesión que originó el cambio auditado — una consulta JPA ahí
     * reentra esa misma sesión y produce un
     * org.hibernate.AssertionFailure ("has a null identifier") sobre la
     * propia entidad que se está insertando/actualizando. Se descubrió así,
     * probando en vivo: la primera versión usaba UserRepository y tumbaba
     * con 500 cualquier alta de producto.
     *
     * Devuelve null si no hay usuario autenticado en el contexto (una
     * escritura fuera de una petición HTTP) o si el email no corresponde a
     * ninguna cuenta — de ahí que sy_audit_log.user_id admita NULL (V6).
     */
    public Long resolveUserId(String email) {
        if (email == null) return null;
        try {
            return jdbcTemplate.queryForObject(FIND_USER_ID_BY_EMAIL_SQL, Long.class, email);
        } catch (EmptyResultDataAccessException ex) {
            return null;
        }
    }

    @Transactional(readOnly = true)
    public Page<AuditLogResponse> search(String entity, Long entityId, Long userId,
                                          LocalDateTime from, LocalDateTime to, Pageable pageable) {
        Specification<AuditLog> spec = Specification.allOf(
                (root, query, cb) -> entity == null ? null : cb.equal(root.get("entity"), entity),
                (root, query, cb) -> entityId == null ? null : cb.equal(root.get("entityId"), entityId),
                (root, query, cb) -> userId == null ? null : cb.equal(root.get("userId"), userId),
                (root, query, cb) -> from == null ? null : cb.greaterThanOrEqualTo(root.get("eventDate"), from),
                (root, query, cb) -> to == null ? null : cb.lessThanOrEqualTo(root.get("eventDate"), to));

        return auditLogRepository.findAll(spec, pageable).map(this::toResponse);
    }

    private AuditLogResponse toResponse(AuditLog log) {
        return new AuditLogResponse(
                log.getId(),
                log.getEntity(),
                log.getEntityId(),
                log.getAction(),
                log.getUserId(),
                fromJson(log.getOldValues()),
                fromJson(log.getNewValues()),
                log.getEventDate());
    }

    private String toJson(Map<String, Object> values) {
        if (values == null || values.isEmpty()) return null;
        try {
            return objectMapper.writeValueAsString(values);
        } catch (JacksonException ex) {
            log.warn("No se pudo serializar un valor de auditoría a JSON: {}", ex.getMessage());
            return null;
        }
    }

    private Object fromJson(String json) {
        if (json == null) return null;
        try {
            return objectMapper.readValue(json, Object.class);
        } catch (JacksonException ex) {
            log.warn("No se pudo interpretar un valor de auditoría almacenado como JSON: {}", ex.getMessage());
            return json;
        }
    }
}
