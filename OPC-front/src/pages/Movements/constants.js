// Tipos de movimiento manual de inventario (opcback.inventory ENUM MovementType).
export const MOVEMENT_TYPES = [
  { value: 'PURCHASE', label: 'Compra (ingreso)' },
  { value: 'SALE', label: 'Venta (retiro)' },
  { value: 'RETURN', label: 'Devolución (ingreso)' },
  { value: 'POSITIVE_ADJUSTMENT', label: 'Ajuste positivo (ingreso)' },
  { value: 'NEGATIVE_ADJUSTMENT', label: 'Ajuste negativo (retiro)' },
  { value: 'TRANSFER_IN', label: 'Transferencia recibida (ingreso)' },
  { value: 'TRANSFER_OUT', label: 'Transferencia enviada (retiro)' },
];
