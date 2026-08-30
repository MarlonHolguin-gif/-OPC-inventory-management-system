package opcback.dashboard.dto;

import java.math.BigDecimal;

/**
 * Un punto de la serie temporal de ventas — month en formato "yyyy-MM"
 * (YearMonth.toString()), listo para usar directo como etiqueta del eje X
 * de una gráfica sin transformación adicional en el frontend.
 */
public record MonthlySalesPoint(String month, BigDecimal total) {
}
