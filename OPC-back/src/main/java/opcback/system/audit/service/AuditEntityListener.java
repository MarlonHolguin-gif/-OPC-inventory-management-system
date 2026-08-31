package opcback.system.audit.service;

import lombok.RequiredArgsConstructor;
import opcback.auth.entity.User;
import opcback.system.audit.Auditable;
import opcback.system.audit.entity.AuditAction;
import org.hibernate.Hibernate;
import org.hibernate.event.spi.PostDeleteEvent;
import org.hibernate.event.spi.PostDeleteEventListener;
import org.hibernate.event.spi.PostInsertEvent;
import org.hibernate.event.spi.PostInsertEventListener;
import org.hibernate.event.spi.PostUpdateEvent;
import org.hibernate.event.spi.PostUpdateEventListener;
import org.hibernate.persister.entity.EntityPersister;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import jakarta.persistence.Entity;
import java.lang.reflect.Method;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.IntStream;

/**
 * Mecanismo CENTRALIZADO de auditoría (tarjeta "Interceptor/aspecto genérico
 * de auditoría"): un único listener de bajo nivel de Hibernate, registrado
 * una sola vez en {@link opcback.system.audit.config.AuditListenerConfig},
 * que intercepta cada INSERT/UPDATE/DELETE que hace Hibernate sobre CUALQUIER
 * entidad que implemente {@link Auditable} — ningún servicio de negocio
 * (ProductService, UserService, PriceListService, PurchaseOrderService,
 * TransferService, ...) llama a esto ni sabe que existe.
 *
 * Se registra como PostInsertEventListener/PostUpdateEventListener/
 * PostDeleteEventListener (no como @EntityListeners de JPA) porque solo el
 * evento de Hibernate trae, para UPDATE, el estado ANTERIOR de la fila
 * (getOldState()) junto al nuevo — con @PreUpdate/@PostUpdate de JPA el
 * objeto ya viene mutado en memoria y el valor anterior real (el que había
 * en la fila antes del UPDATE) ya se perdió.
 */
@Component
@RequiredArgsConstructor
public class AuditEntityListener implements PostInsertEventListener, PostUpdateEventListener, PostDeleteEventListener {

    /** Nunca debe aparecer en un valor auditado, ni como "anterior" ni como "nuevo". */
    private static final Map<Class<?>, Set<String>> EXCLUDED_PROPERTIES = Map.of(
            User.class, Set.of("passwordHash"));

    /** Distingue "el valor es null" de "esta propiedad no se audita" (colecciones de líneas). */
    private static final Object SKIP = new Object();

    private final AuditLogService auditLogService;

    @Override
    public void onPostInsert(PostInsertEvent event) {
        if (!(event.getEntity() instanceof Auditable)) return;
        Map<String, Object> newValues =
                toValueMap(event.getEntity().getClass(), event.getPersister().getPropertyNames(), event.getState());
        write(event.getEntity().getClass(), event.getId(), AuditAction.CREATE, null, newValues);
    }

    @Override
    public void onPostUpdate(PostUpdateEvent event) {
        if (!(event.getEntity() instanceof Auditable)) return;

        Class<?> entityClass = event.getEntity().getClass();
        String[] propertyNames = event.getPersister().getPropertyNames();
        int[] dirty = event.getDirtyProperties();
        // getDirtyProperties() puede venir null si Hibernate no llegó a calcularlas
        // (poco común) — en ese caso se recorren todas y se filtra por diferencia real.
        int[] indexes = dirty != null ? dirty : IntStream.range(0, propertyNames.length).toArray();

        Map<String, Object> oldValues = new LinkedHashMap<>();
        Map<String, Object> newValues = new LinkedHashMap<>();
        for (int index : indexes) {
            String propertyName = propertyNames[index];
            if (isExcluded(entityClass, propertyName)) continue;

            Object oldValue = normalize(event.getOldState()[index]);
            Object newValue = normalize(event.getState()[index]);
            if (oldValue == SKIP || newValue == SKIP) continue;
            if (Objects.equals(oldValue, newValue)) continue;

            oldValues.put(propertyName, oldValue);
            newValues.put(propertyName, newValue);
        }

        if (oldValues.isEmpty()) return; // nada auditable cambió de verdad
        write(entityClass, event.getId(), AuditAction.UPDATE, oldValues, newValues);
    }

    @Override
    public void onPostDelete(PostDeleteEvent event) {
        if (!(event.getEntity() instanceof Auditable)) return;
        Map<String, Object> oldValues =
                toValueMap(event.getEntity().getClass(), event.getPersister().getPropertyNames(), event.getDeletedState());
        write(event.getEntity().getClass(), event.getId(), AuditAction.DELETE, oldValues, null);
    }

    @Override
    public boolean requiresPostCommitHandling(EntityPersister persister) {
        // false = manejar en el flush mismo, no diferir a después del commit —
        // así el registro de auditoría queda en la MISMA transacción que el
        // cambio que audita (ver el javadoc de AuditLogService sobre por qué
        // eso importa para el caso de rollback).
        return false;
    }

    private void write(Class<?> entityClass, Object id, AuditAction action,
                        Map<String, Object> oldValues, Map<String, Object> newValues) {
        long entityId = ((Number) id).longValue();
        Long userId = auditLogService.resolveUserId(currentUserEmail());
        auditLogService.record(entityClass.getSimpleName(), entityId, action, userId, oldValues, newValues);
    }

    private Map<String, Object> toValueMap(Class<?> entityClass, String[] propertyNames, Object[] state) {
        Map<String, Object> values = new LinkedHashMap<>();
        for (int i = 0; i < propertyNames.length; i++) {
            if (isExcluded(entityClass, propertyNames[i])) continue;
            Object value = normalize(state[i]);
            if (value == SKIP) continue;
            values.put(propertyNames[i], value);
        }
        return values;
    }

    /**
     * Reduce cada valor de propiedad a algo serializable en JSON de forma
     * segura:
     * - Colecciones (@OneToMany, ej. items de una orden/transferencia/lista
     *   de precios) se excluyen — auditarlas requeriría serializar cada fila
     *   hija completa, con el riesgo real de referencias circulares hacia el
     *   padre (ej. TransferItem.transfer) y de payloads enormes; no son
     *   "entidades clave" pedidas por la tarjeta.
     * - Asociaciones (@ManyToOne, ej. Product.category) se reducen a su id:
     *   Hibernate.getClass() evita inicializar el proxy solo para saber su
     *   tipo real, y llamar a getId() sobre un proxy Hibernate no lo
     *   inicializa (el id ya lo conoce sin ir a la base).
     */
    private Object normalize(Object value) {
        if (value == null) return null;
        if (value instanceof Collection) return SKIP;

        Class<?> realClass = Hibernate.getClass(value);
        if (realClass.isAnnotationPresent(Entity.class)) {
            return extractId(value);
        }
        return value;
    }

    private Object extractId(Object entity) {
        try {
            Method getId = entity.getClass().getMethod("getId");
            return getId.invoke(entity);
        } catch (ReflectiveOperationException ex) {
            return null;
        }
    }

    private boolean isExcluded(Class<?> entityClass, String propertyName) {
        return EXCLUDED_PROPERTIES.getOrDefault(entityClass, Set.of()).contains(propertyName);
    }

    private String currentUserEmail() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null ? authentication.getName() : null;
    }
}
