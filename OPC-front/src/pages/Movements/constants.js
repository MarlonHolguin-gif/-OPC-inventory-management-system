// Tipos de movimiento manual de inventario (opcback.inventory ENUM MovementType).
// Solo se exponen los ajustes que no tienen un módulo propio: compras genera
// PURCHASE, ventas genera SALE y transferencias genera TRANSFER_IN/TRANSFER_OUT
// de forma automática, así que esos no deben registrarse desde este formulario.
export const MOVEMENT_TYPES = [
  { value: 'RETURN', label: 'Devolución (ingreso)' },
  { value: 'POSITIVE_ADJUSTMENT', label: 'Ajuste positivo (ingreso)' },
  { value: 'NEGATIVE_ADJUSTMENT', label: 'Ajuste negativo (retiro)' },
];
