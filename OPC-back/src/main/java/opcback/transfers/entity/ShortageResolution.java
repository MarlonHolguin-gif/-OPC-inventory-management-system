package opcback.transfers.entity;

/**
 * Tratamiento que se le da al faltante de una recepción parcial (paso 5 del
 * flujo de transferencias). Valores idénticos al ENUM de
 * tr_transfers.shortage_resolution en V8__transfer_shortage_resolution.sql —
 * no cambiar sin cambiar también la migración.
 */
public enum ShortageResolution {
    RESHIPMENT,
    ADJUSTMENT,
    CLAIM
}
