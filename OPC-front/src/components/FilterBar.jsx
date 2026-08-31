import './FilterBar.css';

/**
 * Barra de filtros horizontal. Cada campo va envuelto en <FilterField> para
 * que la etiqueta quede sobre su control y los campos se alineen en fila.
 *
 *   <FilterBar onSubmit={c.search}>
 *     <FilterField><SelectField ... /></FilterField>
 *     ...
 *     <FilterBar.Actions>
 *       <button type="submit">Filtrar</button>
 *       <button type="button" onClick={c.clearFilters}>Limpiar</button>
 *     </FilterBar.Actions>
 *   </FilterBar>
 */
export function FilterBar({ onSubmit, children }) {
  return (
    <form className="filter-bar" onSubmit={onSubmit} noValidate>
      {children}
    </form>
  );
}

export function FilterField({ children }) {
  return <div className="filter-field">{children}</div>;
}

FilterBar.Actions = function FilterBarActions({ children }) {
  return <div className="filter-actions">{children}</div>;
};
