import { signal, computed, effect } from '@preact/signals-react';

const MODE_KEY = 'opc_nav_mode';
const PINNED_KEY = 'opc_nav_pinned';

const MODES = ['expanded', 'icons', 'hidden'];

function readMode() {
  try {
    const stored = localStorage.getItem(MODE_KEY);
    return MODES.includes(stored) ? stored : 'expanded';
  } catch {
    return 'expanded';
  }
}

function readPinned() {
  try {
    return localStorage.getItem(PINNED_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Estado del riel de navegación lateral.
 *
 *  - `mode`: cómo se muestra el riel — 'expanded' (íconos + texto),
 *    'icons' (solo íconos) u 'hidden' (oculto). Lo elige el usuario y se
 *    recuerda entre sesiones.
 *  - `pinned` ("fijar menú"): si está activo, el riel NO se despliega solo al
 *    pasar el cursor; queda exactamente en su modo. Si está inactivo (por
 *    defecto) y el modo es 'icons' u 'hidden', acercar el cursor lo muestra
 *    completo como capa flotante sobre el contenido.
 *  - `peeking`: transitorio (no se persiste) — true mientras el cursor lo
 *    mantiene desplegado.
 */
export class NavStore {
  static mode = signal(readMode());
  static pinned = signal(readPinned());
  static peeking = signal(false);

  // Modo con el que se pinta el riel: si está "asomándose", se ve completo
  // aunque el modo elegido sea otro.
  static effectiveMode = computed(() =>
    NavStore.isPeeking.value ? 'expanded' : NavStore.mode.value,
  );

  // ¿El riel está desplegado por el cursor (capa flotante, no empuja contenido)?
  static isPeeking = computed(
    () => NavStore.peeking.value && !NavStore.pinned.value && NavStore.mode.value !== 'expanded',
  );

  static setMode(mode) {
    if (MODES.includes(mode)) NavStore.mode.value = mode;
  }

  // Cicla expanded -> icons -> hidden -> expanded.
  static cycleMode() {
    const next = (MODES.indexOf(NavStore.mode.value) + 1) % MODES.length;
    NavStore.mode.value = MODES[next];
    NavStore.peeking.value = false;
  }

  static togglePinned() {
    NavStore.pinned.value = !NavStore.pinned.value;
  }

  static setPeeking(value) {
    NavStore.peeking.value = value;
  }
}

// Persiste modo y "fijar" cuando cambian.
effect(() => {
  const mode = NavStore.mode.value;
  const pinned = NavStore.pinned.value;
  try {
    localStorage.setItem(MODE_KEY, mode);
    localStorage.setItem(PINNED_KEY, String(pinned));
  } catch {
    // localStorage no disponible (modo privado, etc.) — la navegación sigue
    // funcionando, solo no se recuerda la preferencia.
  }
});
