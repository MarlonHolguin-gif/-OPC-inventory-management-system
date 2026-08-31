import { Controller } from '@/lib/Controller';

/**
 * Base para controllers de vistas que se auto-refrescan cada N ms sin
 * recargar la página (panel de transferencias, campana de notificaciones…).
 *
 * La subclase define `intervalMs` e implementa `tick()` (la carga/refresco).
 * `tick()` se llama una vez al montar y luego en cada intervalo.
 */
export class PollingController extends Controller {
  intervalMs = 20000;
  #timer = null;

  onMount() {
    if (this.#timer) return; // guarda contra el doble-invoke de StrictMode
    this.tick();
    this.#timer = setInterval(() => this.tick(), this.intervalMs);
  }

  onUnmount() {
    if (this.#timer) {
      clearInterval(this.#timer);
      this.#timer = null;
    }
    super.onUnmount();
  }

  tick() {
    throw new Error('PollingController: falta implementar tick()');
  }
}
