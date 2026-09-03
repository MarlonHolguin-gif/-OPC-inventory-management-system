package opcback.system.audit.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import opcback.products.entity.Category;
import opcback.products.entity.Product;
import opcback.products.entity.Unit;
import opcback.products.repository.CategoryRepository;
import opcback.products.repository.ProductRepository;
import opcback.products.repository.UnitRepository;
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
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;

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

    /** Única entidad auditada hoy (ver Auditable.java). */
    private static final String PRODUCT_ENTITY = "Product";

    /**
     * Propiedades de Product que son asociaciones @ManyToOne — AuditEntityListener
     * las guarda reducidas a su id, así que en la vista hay que traducirlas a un
     * nombre legible ("baseUnit: 4" -> "baseUnit: Litro (lt)").
     */
    private static final String CATEGORY_FIELD = "category";
    private static final String BASE_UNIT_FIELD = "baseUnit";

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final AuditLogRepository auditLogRepository;
    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final UnitRepository unitRepository;

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

        Page<AuditLog> page = auditLogRepository.findAll(spec, pageable);
        Labels labels = resolveLabels(page.getContent());
        return page.map(log -> toResponse(log, labels));
    }

    /**
     * Traduce, para toda la página en tres consultas, los ids que aparecen en
     * los registros de auditoría a texto legible: el producto de cada evento
     * ("Nombre (SKU)") y las asociaciones que quedaron guardadas como id
     * (categoría, unidad base).
     */
    private Labels resolveLabels(List<AuditLog> logs) {
        List<Long> productIds = new ArrayList<>();
        Set<Long> categoryIds = new TreeSet<>();
        Set<Long> unitIds = new TreeSet<>();

        for (AuditLog log : logs) {
            if (!PRODUCT_ENTITY.equals(log.getEntity())) {
                continue;
            }
            productIds.add(log.getEntityId());
            for (Object values : List.of(safeMap(fromJson(log.getOldValues())), safeMap(fromJson(log.getNewValues())))) {
                collectId((Map<?, ?>) values, CATEGORY_FIELD, categoryIds);
                collectId((Map<?, ?>) values, BASE_UNIT_FIELD, unitIds);
            }
        }

        Map<Long, String> products = productIds.isEmpty() ? Map.of()
                : productRepository.findAllById(productIds.stream().distinct().toList()).stream()
                        .collect(Collectors.toMap(Product::getId, p -> "%s (%s)".formatted(p.getName(), p.getSku())));
        Map<Long, String> categories = categoryIds.isEmpty() ? Map.of()
                : categoryRepository.findAllById(categoryIds).stream()
                        .collect(Collectors.toMap(Category::getId, Category::getName));
        Map<Long, String> units = unitIds.isEmpty() ? Map.of()
                : unitRepository.findAllById(unitIds).stream()
                        .collect(Collectors.toMap(Unit::getId, u -> "%s (%s)".formatted(u.getName(), u.getAbbreviation())));

        return new Labels(products, categories, units);
    }

    private record Labels(Map<Long, String> products, Map<Long, String> categories, Map<Long, String> units) {
    }

    private static Map<?, ?> safeMap(Object parsed) {
        return parsed instanceof Map<?, ?> map ? map : Map.of();
    }

    private static void collectId(Map<?, ?> values, String field, Set<Long> into) {
        if (values.get(field) instanceof Number number) {
            into.add(number.longValue());
        }
    }

    private AuditLogResponse toResponse(AuditLog log, Labels labels) {
        boolean isProduct = PRODUCT_ENTITY.equals(log.getEntity());
        Object oldValues = enrich(fromJson(log.getOldValues()), labels, isProduct);
        Object newValues = enrich(fromJson(log.getNewValues()), labels, isProduct);
        return new AuditLogResponse(
                log.getId(),
                log.getEntity(),
                log.getEntityId(),
                resolveEntityLabel(log, labels.products(), oldValues, newValues),
                log.getAction(),
                log.getUserId(),
                oldValues,
                newValues,
                log.getEventDate());
    }

    /**
     * Sustituye los ids de asociación por su nombre legible. Si el id ya no
     * resuelve (la categoría/unidad fue borrada) se deja como "#id" para que
     * al menos se vea que era una referencia y no un número suelto.
     */
    @SuppressWarnings("unchecked")
    private Object enrich(Object parsed, Labels labels, boolean isProduct) {
        if (!isProduct || !(parsed instanceof Map)) {
            return parsed;
        }
        Map<String, Object> values = new LinkedHashMap<>((Map<String, Object>) parsed);
        replaceId(values, CATEGORY_FIELD, labels.categories());
        replaceId(values, BASE_UNIT_FIELD, labels.units());
        return values;
    }

    private static void replaceId(Map<String, Object> values, String field, Map<Long, String> labels) {
        if (values.get(field) instanceof Number number) {
            String label = labels.get(number.longValue());
            values.put(field, label != null ? label : "#" + number.longValue());
        }
    }

    /**
     * Prioridad: el nombre actual del producto; si ya no existe, el que quedó
     * guardado en el propio registro (una CREATE/DELETE siempre trae name y
     * sku; una UPDATE solo si esos campos cambiaron); en último caso, null.
     */
    private String resolveEntityLabel(AuditLog log, Map<Long, String> productLabels, Object oldValues, Object newValues) {
        if (!PRODUCT_ENTITY.equals(log.getEntity())) {
            return null;
        }
        String current = productLabels.get(log.getEntityId());
        if (current != null) {
            return current;
        }
        return labelFromValues(newValues != null ? newValues : oldValues);
    }

    @SuppressWarnings("unchecked")
    private String labelFromValues(Object parsed) {
        if (!(parsed instanceof Map)) {
            return null;
        }
        Map<String, Object> values = (Map<String, Object>) parsed;
        Object name = values.get("name");
        Object sku = values.get("sku");
        if (name == null) {
            return sku != null ? sku.toString() : null;
        }
        return sku != null ? "%s (%s)".formatted(name, sku) : name.toString();
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
