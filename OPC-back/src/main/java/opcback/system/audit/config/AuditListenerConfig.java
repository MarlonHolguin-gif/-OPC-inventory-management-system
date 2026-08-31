package opcback.system.audit.config;

import jakarta.annotation.PostConstruct;
import jakarta.persistence.EntityManagerFactory;
import lombok.RequiredArgsConstructor;
import opcback.system.audit.service.AuditEntityListener;
import org.hibernate.engine.spi.SessionFactoryImplementor;
import org.hibernate.event.service.spi.EventListenerRegistry;
import org.hibernate.event.spi.EventType;
import org.springframework.context.annotation.Configuration;

/**
 * Registra AuditEntityListener directamente en el EventListenerRegistry de
 * Hibernate al arrancar — es el único punto de "instalación" del mecanismo
 * genérico de auditoría; de ahí en más, cualquier entidad que implemente
 * Auditable queda auditada sin tocar un solo servicio de negocio.
 */
@Configuration
@RequiredArgsConstructor
public class AuditListenerConfig {

    private final EntityManagerFactory entityManagerFactory;
    private final AuditEntityListener auditEntityListener;

    @PostConstruct
    public void registerAuditListener() {
        SessionFactoryImplementor sessionFactory = entityManagerFactory.unwrap(SessionFactoryImplementor.class);
        EventListenerRegistry registry = sessionFactory.getServiceRegistry().getService(EventListenerRegistry.class);

        registry.appendListeners(EventType.POST_INSERT, auditEntityListener);
        registry.appendListeners(EventType.POST_UPDATE, auditEntityListener);
        registry.appendListeners(EventType.POST_DELETE, auditEntityListener);
    }
}
