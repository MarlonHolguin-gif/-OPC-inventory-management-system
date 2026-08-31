/**
 * Campo de búsqueda controlado. Llama `onChange(nextValue)`.
 */
export function SearchBar({ value, onChange, placeholder = 'Buscar…', label = 'Buscar', ...rest }) {
  return (
    <input
      type="search"
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={label}
      {...rest}
    />
  );
}
