import { signal } from '@preact/signals-react';

/**
 * Mensajería global de la UI. Reemplaza el prop-drilling de `setError` que
 * hoy atraviesa casi todas las páginas. Un componente <Alert> montado en el
 * layout lee estos signals y los muestra.
 *
 * Cada mensaje (éxito o error) se borra solo tras MESSAGE_TIMEOUT_MS; el
 * temporizador se reinicia con cada mensaje nuevo y se cancela con clear().
 */
const MESSAGE_TIMEOUT_MS = 2000;

let autoClearTimer = null;

function scheduleAutoClear() {
  clearTimeout(autoClearTimer);
  autoClearTimer = setTimeout(() => {
    autoClearTimer = null;
    UiStore.error.value = null;
    UiStore.success.value = null;
  }, MESSAGE_TIMEOUT_MS);
}

export class UiStore {
  static error = signal(null);
  static success = signal(null);

  static fail(message) {
    UiStore.error.value = message;
    UiStore.success.value = null;
    scheduleAutoClear();
  }

  static notify(message) {
    UiStore.success.value = message;
    UiStore.error.value = null;
    scheduleAutoClear();
  }

  static clear() {
    clearTimeout(autoClearTimer);
    autoClearTimer = null;
    UiStore.error.value = null;
    UiStore.success.value = null;
  }
}
