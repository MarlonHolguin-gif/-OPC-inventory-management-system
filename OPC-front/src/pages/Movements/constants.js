// Tipos de movimiento manual de inventario (opcback.inventory ENUM MovementType).
// Solo se exponen los ajustes que no tienen un módulo propio: compras genera
// PURCHASE, ventas genera SALE y transferencias genera TRANSFER_IN/TRANSFER_OUT
// de forma automática, así que esos no deben registrarse desde este formulario.
export const MOVEMENT_TYPES = [
  { value: 'RETURN', label: 'Devolución (ingreso)' },
  { value: 'POSITIVE_ADJUSTMENT', label: 'Ajuste positivo (ingreso)' },
  { value: 'NEGATIVE_ADJUSTMENT', label: 'Ajuste negativo (retiro)' },
];

// Etiquetas legibles de TODOS los tipos para el historial — ahí sí aparecen
// los movimientos generados por Compras, Ventas y Transferencias.
export const MOVEMENT_TYPE_LABELS = {
  PURCHASE: 'Compra (ingreso)',
  SALE: 'Venta (retiro)',
  RETURN: 'Devolución (ingreso)',
  POSITIVE_ADJUSTMENT: 'Ajuste positivo (ingreso)',
  NEGATIVE_ADJUSTMENT: 'Ajuste negativo (retiro)',
  TRANSFER_IN: 'Transferencia recibida (ingreso)',
  TRANSFER_OUT: 'Transferencia enviada (retiro)',
};

export function movementTypeLabel(type) {
  return MOVEMENT_TYPE_LABELS[type] ?? type;
}

// Opciones para el filtro del historial: los 7 tipos (los del formulario y
// los generados por Compras/Ventas/Transferencias).
export const MOVEMENT_TYPE_FILTER_OPTIONS = Object.entries(MOVEMENT_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));
