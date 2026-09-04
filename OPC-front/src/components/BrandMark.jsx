/**
 * Monograma de la marca: «OPI» sobre una línea-estante, en una teja con el
 * verde de acento. Comparten este componente el acceso y el riel de
 * navegación; el favicon replica el mismo trazo en `public/favicon.svg`.
 *
 * El texto y la línea usan `var(--bg)` para recortarse sobre el acento,
 * igual que hacía el logo anterior — así funciona en tema claro y oscuro.
 */
export function BrandMark({ size = 48, title = 'OptiPlant Inventory', ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      {...rest}
    >
      <rect width="64" height="64" rx="15" fill="var(--accent)" />
      <text
        x="32"
        y="34"
        textAnchor="middle"
        fill="var(--bg)"
        style={{ font: '700 21px var(--font-heading)', letterSpacing: '0.5px' }}
      >
        OPI
      </text>
      <rect x="14" y="42" width="36" height="3" rx="1.5" fill="var(--bg)" opacity="0.9" />
    </svg>
  );
}
