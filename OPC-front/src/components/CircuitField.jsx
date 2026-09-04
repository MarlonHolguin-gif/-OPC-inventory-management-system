import './CircuitField.css';

/**
 * Fondo de marca: nodos conectados por trazas en ángulo recto —lenguaje de
 * placa de circuito— en el verde de acento y a baja opacidad, para acompañar
 * sin distraer. Lo comparten el acceso y la pantalla de carga (LoadingScreen).
 * Es estático salvo dos «chispas» que recorren un par de trazas y los nodos
 * que laten; ambas cosas se detienen con `prefers-reduced-motion` (ver
 * CircuitField.css). Decorativo: `aria-hidden`.
 */
export function CircuitField() {
  return (
    <svg
      className="circuit-field"
      viewBox="0 0 400 480"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <g className="circuit-trace">
        <path d="M20 44 H118 V96 H176 L206 66 H300 V30" />
        <path d="M60 232 H150 V168 H236 L268 200 H366" />
        <path d="M40 400 H130 V344 H210 L240 374 H360" />
        <path d="M330 300 V366 H300 V440 H210" />
      </g>
      <g className="circuit-trace circuit-trace--faint">
        <path d="M300 66 V150 H352" />
        <path d="M118 96 V210 H84 V300" />
        <path d="M236 200 V286 L206 316 H120" />
        <path d="M40 150 L76 186" />
        <path d="M300 410 L336 446" />
      </g>

      <g className="circuit-pad">
        <circle cx="118" cy="96" r="2.4" />
        <circle cx="206" cy="66" r="2.4" />
        <circle cx="84" cy="300" r="2.4" />
        <circle cx="150" cy="232" r="2.4" />
        <circle cx="236" cy="200" r="2.4" />
        <circle cx="130" cy="400" r="2.4" />
        <circle cx="210" cy="344" r="2.4" />
        <circle cx="300" cy="366" r="2.4" />
        <circle cx="352" cy="150" r="2.4" />
      </g>

      <circle className="circuit-hub" cx="176" cy="96" r="3.4" style={{ animationDelay: '0s' }} />
      <circle className="circuit-hub" cx="268" cy="200" r="3.4" style={{ animationDelay: '1.2s' }} />
      <circle className="circuit-hub" cx="240" cy="374" r="3.4" style={{ animationDelay: '2.4s' }} />

      <circle className="circuit-spark circuit-spark--a" r="1.8" />
      <circle className="circuit-spark circuit-spark--b" r="1.8" />
    </svg>
  );
}
