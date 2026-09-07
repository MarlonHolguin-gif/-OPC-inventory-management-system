import { createContext } from 'react';

/**
 * Nodo del hueco de la barra superior (.topbar-slot). El AppLayout lo publica
 * y las páginas lo consumen con `TopbarPortal` para colocar controles propios
 * junto al saludo, solo mientras esa página está montada.
 */
export const TopbarSlotContext = createContext(null);
