package opcback.system.audit;

/**
 * Marca las entidades que {@link opcback.system.audit.service.AuditEntityListener}
 * debe auditar automáticamente (CREATE/UPDATE/DELETE) en AUDITORIA. Sin
 * métodos a propósito — es solo un filtro para el listener genérico, no un
 * contrato de comportamiento.
 *
 * Alcance deliberado: solo las "entidades clave" que pidió la tarjeta
 * (productos, precios, usuarios, órdenes, transferencias) — no sus líneas
 * de detalle (ProductUnit, PriceListItem, PurchaseOrderItem, TransferItem)
 * ni el resto del dominio (movimientos de inventario, ventas, recepciones,
 * notificaciones, etc.), que no se pidieron y agregarían ruido sin valor.
 */
public interface Auditable {
}
