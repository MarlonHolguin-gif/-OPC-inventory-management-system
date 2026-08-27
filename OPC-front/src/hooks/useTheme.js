import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'opc_theme';

// index.html ya deja el atributo correcto en <html> antes de que React
// monte (para evitar el parpadeo del tema equivocado en la primera
// pintada) — este hook solo lee ese estado inicial, no decide el default.
function readCurrentTheme() {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

export function useTheme() {
  const [theme, setTheme] = useState(readCurrentTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // localStorage no disponible (modo privado, etc.) — el tema sigue
      // funcionando, solo no se recuerda entre sesiones.
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, toggleTheme };
}
