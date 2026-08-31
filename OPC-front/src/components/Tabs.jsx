import './Tabs.css';

/**
 * Navegación por pestañas. `items` es [{ id, label }]; `active` es el id
 * activo; `onSelect(id)` cambia de pestaña.
 */
export function Tabs({ items, active, onSelect }) {
  return (
    <nav className="tabs">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item.id)}
          disabled={active === item.id}
          aria-current={active === item.id ? 'page' : undefined}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
