package opcback.system.audit;

/**
 * Marca las entidades que {@link opcback.system.audit.service.AuditEntityListener}
 * debe auditar automáticamente (CREATE/UPDATE/DELETE) en AUDITORIA. Sin
 * métodos a propósito — es solo un filtro para el listener genérico, no un
 * contrato de comportamiento.
 *
 * Alcance deliberado: solo el catálogo de productos (`Product`) — es lo que
 * pide la sección 3.1 ("registro de cada acción sobre el inventario: quién,
 * cuándo y por qué"). El resto del dominio no se audita aquí: la
 * trazabilidad de inventario y de transferencias ya la dan sus propias
 * tablas de historial (tr_inventory_movements, tr_transfer_events), y el
 * resto (usuarios, listas de precios, órdenes de compra) quedó fuera de
 * alcance por decisión del proyecto.
 */
public interface Auditable {
}
