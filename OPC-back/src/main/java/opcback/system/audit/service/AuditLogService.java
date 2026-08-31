package opcback.system.audit.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import opcback.auth.entity.User;
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
import org.springframework.transaction.annotation.Propagation;
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
 * record(...) NO declara @Transactional propia: para CREATE/UPDATE/DELETE
 * corre dentro de la transacción de negocio que originó el cambio (la del
 * flush de Hibernate que disparó el listener) a propósito — si esa
 * transacción hace rollback, el registro de auditoría de ese cambio
 * también debe desaparecer, no tendría sentido auditar un cambio que nunca
 * ocurrió. Los eventos de LOGIN son la excepción — ver
 * recordLoginSuccess/recordLoginFailure.
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
     * no debe tumbar la operación de negocio que la originó — ni el login,
     * ni un alta/edición/baja de producto, usuario, precio, orden de
     * compra o transferencia.
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
     */
    public Long resolveUserId(String email) {
        if (email == null) return null;
        try {
            return jdbcTemplate.queryForObject(FIND_USER_ID_BY_EMAIL_SQL, Long.class, email);
        } catch (EmptyResultDataAccessException ex) {
            return null;
        }
    }

    /**
     * REQUIRES_NEW a propósito, a diferencia de record(): AuthService.login()
     * vuelve a lanzar la excepción de autenticación después de llamar a
     * recordLoginFailure (para que el cliente siga recibiendo el mismo 401
     * de siempre), y eso deja la transacción de login() marcada
     * rollback-only. Si este registro corriera en esa misma transacción,
     * el rollback se llevaría puesto el propio registro del intento
     * fallido — justo el caso que el criterio de aceptación pide conservar.
     * Una transacción nueva e independiente lo protege de ese rollback.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordLoginSuccess(User user) {
        record("Auth", user.getId(), AuditAction.LOGIN, user.getId(), null,
                Map.of("email", user.getEmail(), "result", "SUCCESS"));
    }

    /**
     * entity_id es NOT NULL en sy_audit_log; si el email intentado no
     * corresponde a ningún usuario no hay un id real que asociarle. Se usa
     * 0 como centinela ("sin usuario identificado") — nunca es un id real
     * (AUTO_INCREMENT arranca en 1) — y el email intentado igual queda en
     * new_values para el registro interno, sin exponerlo nunca en la
     * respuesta HTTP (eso lo resuelve el 401 genérico de
     * GlobalExceptionHandler, sin relación con este método). Ver el
     * javadoc de recordLoginSuccess sobre por qué REQUIRES_NEW.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordLoginFailure(String attemptedEmail, Long matchedUserId) {
        long entityId = matchedUserId != null ? matchedUserId : 0L;
        record("Auth", entityId, AuditAction.LOGIN, matchedUserId, null,
                Map.of("email", attemptedEmail, "result", "FAILURE"));
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
