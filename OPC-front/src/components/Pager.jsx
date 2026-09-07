import './Pager.css';

/**
 * Paginador estilo Google: "1–50 de 234" + flechas atrás/adelante. `page` es
 * el índice de página (base 0). No pinta nada si no hay datos.
 */
export function Pager({ page, pageSize, total, onPrev, onNext }) {
  if (!total) return null;
  const start = page * pageSize + 1;
  const end = Math.min((page + 1) * pageSize, total);

  return (
    <nav className="pager" aria-label="Paginación">
      <span className="pager-range">
        {start}–{end} de {total}
      </span>
      <button type="button" onClick={onPrev} disabled={page === 0} aria-label="Página anterior">
        ‹
      </button>
      <button type="button" onClick={onNext} disabled={end >= total} aria-label="Página siguiente">
        ›
      </button>
    </nav>
  );
}
