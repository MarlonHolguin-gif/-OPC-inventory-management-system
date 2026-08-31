export const GENERAL_ADMIN = 'GENERAL_ADMIN';
export const BRANCH_MANAGER = 'BRANCH_MANAGER';
export const INVENTORY_OPERATOR = 'INVENTORY_OPERATOR';

export const ROLES = [
  { code: 'GENERAL_ADMIN', name: 'Administrador general' },
  { code: 'BRANCH_MANAGER', name: 'Gerente de sucursal' },
  { code: 'INVENTORY_OPERATOR', name: 'Operador de inventario' },
];

export function roleName(code) {
  return ROLES.find((role) => role.code === code)?.name ?? code;
}
