export const ROLES = [
  { code: 'GENERAL_ADMIN', name: 'Administrador general' },
  { code: 'BRANCH_MANAGER', name: 'Gerente de sucursal' },
  { code: 'INVENTORY_OPERATOR', name: 'Operador de inventario' },
];

export function roleName(code) {
  return ROLES.find((role) => role.code === code)?.name ?? code;
}
