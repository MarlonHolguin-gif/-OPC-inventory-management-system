import { useLayoutEffect, useState } from 'react';

/**
 * Calcula cuántas filas de una tabla caben en el alto de un contenedor, para
 * paginar (con "1–50 de N" + flechas) en vez de hacer scroll.
 *
 * Mide el alto real del `<thead>` y de la primera fila del `<tbody>` que haya
 * dentro del contenedor, así que converge en 1–2 renders aunque empiece con
 * pocas filas. Devuelve `[ref, size]`; `ref` es un callback (funciona aunque
 * el contenedor se monte más tarde, p. ej. tras un AsyncBoundary).
 */
export function usePageSize({ min = 3, fallbackRow = 40 } = {}) {
  const [el, setEl] = useState(null);
  const [size, setSize] = useState(min);

  useLayoutEffect(() => {
    if (!el) return undefined;

    const measure = () => {
      const head = el.querySelector('thead');
      const row = el.querySelector('tbody tr');
      const headerHeight = head ? head.getBoundingClientRect().height : 40;
      const rowHeight = row ? row.getBoundingClientRect().height : fallbackRow;
      if (rowHeight <= 0) return;
      const available = el.clientHeight - headerHeight;
      setSize(Math.max(min, Math.floor(available / rowHeight)));
    };

    measure();
    const raf = requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [el, min, fallbackRow]);

  return [setEl, size];
}
