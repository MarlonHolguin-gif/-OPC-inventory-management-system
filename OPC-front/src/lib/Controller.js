/**
 * Base opcional para los controllers de página/sección.
 *
 * Un Controller concentra la lógica de un módulo (carga de datos, acciones,
 * estado en signals) y no contiene JSX. El componente función asociado solo
 * lee sus signals y pinta.
 *
 * Hooks de ciclo de vida (los llama `useController`):
 *  - onMount(): al montar el componente.
 *  - onUnmount(): al desmontar — aquí se liberan suscripciones/intervalos.
 */
export class Controller {
  #disposers = [];

  onMount() {}

  onUnmount() {
    this.#disposers.forEach((dispose) => dispose());
    this.#disposers = [];
  }

  // Registra una función de limpieza (ej. el retorno de `effect()` de signals
  // o un clearInterval) para ejecutarla al desmontar.
  registerDisposer(dispose) {
    this.#disposers.push(dispose);
  }
}
