const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

// Ojo abierto — "mostrar contraseña", el mismo ícono que usan la mayoría de
// formularios de login de la web.
export function EyeIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// Ojo cerrado (con tachado) — "ocultar contraseña".
export function EyeOffIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.2A10.6 10.6 0 0112 5c6.4 0 10 7 10 7a17.6 17.6 0 01-3.4 4.3" />
      <path d="M6.6 6.7C4 8.4 2 12 2 12s3.6 7 10 7a9.7 9.7 0 004.1-.9" />
      <path d="M9.9 10.1a3 3 0 004.1 4" />
    </svg>
  );
}

export function SunIcon(props) {
  return (
    <svg {...base} width={16} height={16} {...props}>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2.4M12 19.1v2.4M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.9 19.1l1.7-1.7M17.4 6.6l1.7-1.7" />
    </svg>
  );
}

export function MoonIcon(props) {
  return (
    <svg {...base} width={16} height={16} {...props}>
      <path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z" />
    </svg>
  );
}
