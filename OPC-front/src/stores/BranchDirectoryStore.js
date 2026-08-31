import { signal, computed } from '@preact/signals-react';
import { HttpClient } from '@/services/http/HttpClient';

/**
 * Directorio de sucursales. Hoy cada página que muestra una sucursal por su
 * id reconstruye este mapa por su cuenta (5+ lugares: NotificationBell,
 * TransfersPage, SalesHistoryPage, ...). Aquí se carga una sola vez y se
 * comparte.
 *
 * Es infraestructura transversal (varios módulos referencian sucursales por
 * id), así que hace su propio GET en vez de depender del servicio del módulo
 * Sucursales.
 */
export class BranchDirectoryStore {
  static all = signal([]);
  static loaded = signal(false);
  static #inFlight = null;

  static byId = computed(() =>
    Object.fromEntries(BranchDirectoryStore.all.value.map((branch) => [branch.id, branch])),
  );

  static nameOf(id) {
    return BranchDirectoryStore.byId.value[id]?.name ?? null;
  }

  static codeOf(id) {
    return BranchDirectoryStore.byId.value[id]?.code ?? null;
  }

  static async ensureLoaded() {
    if (BranchDirectoryStore.loaded.value) return;
    if (!BranchDirectoryStore.#inFlight) {
      BranchDirectoryStore.#inFlight = HttpClient.get('/api/branches')
        .then(({ data }) => {
          BranchDirectoryStore.all.value = data;
          BranchDirectoryStore.loaded.value = true;
        })
        .finally(() => {
          BranchDirectoryStore.#inFlight = null;
        });
    }
    return BranchDirectoryStore.#inFlight;
  }

  static reset() {
    BranchDirectoryStore.all.value = [];
    BranchDirectoryStore.loaded.value = false;
  }
}
