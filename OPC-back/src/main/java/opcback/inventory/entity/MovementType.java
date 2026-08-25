package opcback.inventory.entity;

/**
 * Valores idénticos al ENUM de tr_inventory_movements.movement_type en
 * V1__create_schema.sql — no cambiar sin cambiar también la migración.
 */
public enum MovementType {
    PURCHASE(true),
    SALE(false),
    RETURN(true),
    POSITIVE_ADJUSTMENT(true),
    NEGATIVE_ADJUSTMENT(false),
    TRANSFER_IN(true),
    TRANSFER_OUT(false);

    private final boolean inbound;

    MovementType(boolean inbound) {
        this.inbound = inbound;
    }

    /**
     * true = ingreso (suma a current_quantity), false = retiro (resta).
     */
    public boolean isInbound() {
        return inbound;
    }
}
