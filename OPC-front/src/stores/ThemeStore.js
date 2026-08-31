import { signal, effect } from '@preact/signals-react';

const STORAGE_KEY = 'opc_theme';

// index.html ya deja el atributo correcto en <html> antes de que React
// monte (evita el parpadeo del tema equivocado en la primera pintada).
// Este store solo lee ese estado inicial, no decide el default.
function readInitialTheme() {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

export class ThemeStore {
  static theme = signal(readInitialTheme());

  static toggle() {
    ThemeStore.theme.value = ThemeStore.theme.value === 'dark' ? 'light' : 'dark';
  }
}

// Sincroniza el signal con el DOM y localStorage cada vez que cambia.
effect(() => {
  const theme = ThemeStore.theme.value;
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // localStorage no disponible (modo privado, etc.) — el tema sigue
    // funcionando, solo no se recuerda entre sesiones.
  }
});
