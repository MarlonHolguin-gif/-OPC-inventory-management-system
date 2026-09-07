import { useContext } from 'react';
import { createPortal } from 'react-dom';
import { TopbarSlotContext } from './topbarSlotContext';

/**
 * Coloca a `children` en el hueco de la barra superior (.topbar-slot) del
 * AppLayout. Si el hueco aún no existe no pinta nada.
 */
export function TopbarPortal({ children }) {
  const node = useContext(TopbarSlotContext);
  if (!node) return null;
  return createPortal(children, node);
}
