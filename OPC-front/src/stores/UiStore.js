import { signal } from '@preact/signals-react';

/**
 * Mensajería global de la UI. Reemplaza el prop-drilling de `setError` que
 * hoy atraviesa casi todas las páginas. Un componente <Alert> montado en el
 * layout lee estos signals y los muestra.
 */
export class UiStore {
  static error = signal(null);
  static success = signal(null);

  static fail(message) {
    UiStore.error.value = message;
    UiStore.success.value = null;
  }

  static notify(message) {
    UiStore.success.value = message;
    UiStore.error.value = null;
  }

  static clear() {
    UiStore.error.value = null;
    UiStore.success.value = null;
  }
}
