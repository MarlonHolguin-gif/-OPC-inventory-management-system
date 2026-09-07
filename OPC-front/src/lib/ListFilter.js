import { signal } from '@preact/signals-react';

/**
 * Estado de una barra de filtros con botón "Filtrar" explícito: `draft` es lo
 * que el usuario está escribiendo/eligiendo; `applied` es lo que la lista
 * realmente usa. La lista solo se recalcula al llamar `apply()`.
 *
 *   filter = new ListFilter({ name: '', status: '' });
 *   filtered = computed(() => run(this.items.value, this.filter.applied.value));
 *   // en la página:
 *   <FilterBar onSubmit={controller.filter.apply}>
 *     <TextField value={controller.filter.draft.value.name}
 *       onChange={(v) => controller.filter.set('name', v)} />
 *     <button type="submit">Filtrar</button>
 *     <button type="button" onClick={controller.filter.clear}>Limpiar filtros</button>
 */
export class ListFilter {
  constructor(empty) {
    this.empty = empty;
    this.draft = signal({ ...empty });
    this.applied = signal({ ...empty });
  }

  set = (key, value) => {
    this.draft.value = { ...this.draft.value, [key]: value };
  };

  apply = (event) => {
    event?.preventDefault();
    this.applied.value = { ...this.draft.value };
  };

  clear = () => {
    this.draft.value = { ...this.empty };
    this.applied.value = { ...this.empty };
  };
}
