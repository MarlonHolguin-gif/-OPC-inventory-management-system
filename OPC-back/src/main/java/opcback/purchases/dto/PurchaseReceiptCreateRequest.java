package opcback.purchases.dto;

/**
 * Recepción de una orden de compra. La recepción es siempre total: se recibe
 * todo lo pendiente de la orden o no se recibe nada (se cancela la orden).
 */
public record PurchaseReceiptCreateRequest(
        String notes
) {
}
