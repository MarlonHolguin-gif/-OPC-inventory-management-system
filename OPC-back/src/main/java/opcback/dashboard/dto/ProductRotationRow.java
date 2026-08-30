package opcback.dashboard.dto;

import java.math.BigDecimal;

/**
 * Rotación de un producto en el rango consultado — quantitySold es la suma
 * de INVENTARIO_MOVIMIENTOS de tipo VENTA; movementsCount es cuántas ventas
 * distintas lo movieron (frecuencia, no solo volumen).
 */
public record ProductRotationRow(
        Long productId,
        String productSku,
        String productName,
        BigDecimal quantitySold,
        long movementsCount
) {
}
