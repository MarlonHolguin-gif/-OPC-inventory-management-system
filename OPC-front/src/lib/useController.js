import { useEffect, useState } from 'react';

/**
 * Crea una instancia estable de un Controller para la vida del componente y
 * conecta sus hooks de ciclo de vida.
 *
 *   const controller = useController(CatalogController);
 *
 * La instancia se crea una sola vez (initializer perezoso de useState, no en
 * cada render). El componente se re-renderiza cuando lee
 * `controller.algunSignal.value` gracias al transform de
 * @preact/signals-react — no hace falta estado de React.
 */
export function useController(ControllerClass, ...args) {
  const [controller] = useState(() => new ControllerClass(...args));

  useEffect(() => {
    controller.onMount?.();
    return () => controller.onUnmount?.();
  }, [controller]);

  return controller;
}
