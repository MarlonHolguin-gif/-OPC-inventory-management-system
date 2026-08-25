package opcback.inventory.entity;

/**
 * Estado derivado (no persistido) de un ítem de inventario frente a sus
 * umbrales min_stock/max_stock. Ver InventoryAlertService — es el único
 * lugar que decide esto, para que el dashboard y las Alertas Inteligentes
 * nunca diverjan en el criterio.
 */
public enum AlertStatus {
    LOW_STOCK,
    HIGH_STOCK,
    NORMAL
}
