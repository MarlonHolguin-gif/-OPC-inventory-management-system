import { Controller } from '@/lib/Controller';
import { AuthStore } from '@/stores/AuthStore';

/**
 * Base para controllers de vistas que se auto-refrescan cada N ms sin
 * recargar la página (panel de transferencias, campana de notificaciones…).
 *
 * La subclase define `intervalMs` e implementa `tick()` (la carga/refresco).
 * `tick()` se llama una vez al montar y luego en cada intervalo.
 *
 * El polling se pausa solo cuando no hay sesión: sin esto, la campana de
 * notificaciones seguía pidiendo `/api/notificaciones` tras expirar el token
 * y llenaba la consola de 401.
 */
export class PollingController extends Controller {
  intervalMs = 20000;
  #timer = null;

  onMount() {
    if (this.#timer) return; // guarda contra el doble-invoke de StrictMode
    this.#runTick();
    this.#timer = setInterval(() => this.#runTick(), this.intervalMs);
  }

  onUnmount() {
    if (this.#timer) {
      clearInterval(this.#timer);
      this.#timer = null;
    }
    super.onUnmount();
  }

  #runTick() {
    // Sin sesión no tiene sentido llamar al backend (y el 401 ensuciaría la
    // consola). El interceptor de HttpClient ya redirige al login cuando el
    // token no es recuperable.
    if (!AuthStore.isAuthenticated.value) return;
    Promise.resolve()
      .then(() => this.tick())
      .catch(() => {
        // Un fallo puntual de un refresco no debe tumbar el polling.
      });
  }

  tick() {
    throw new Error('PollingController: falta implementar tick()');
  }
}
