import { signal } from '@preact/signals-react';
import { Controller } from '@/lib/Controller';
import { UiStore } from '@/stores/UiStore';

/**
 * Base para las páginas de listado + CRUD de una entidad (proveedores,
 * clientes, sucursales, listas de precios…).
 *
 * La subclase define:
 *   get service() -> clase con list()/deactivate(id)/reactivate(id)
 *   get errors()  -> { load, deactivate, reactivate } (mensajes)
 * y normalmente un `form = new <Entity>FormController(this)` que tras cada
 * mutación llama `this.load()`.
 */
export class CrudListController extends Controller {
  items = signal([]);
  loading = signal(true);

  async onMount() {
    await this.load();
    this.loading.value = false;
  }

  async load() {
    try {
      this.items.value = await this.service.list();
    } catch {
      UiStore.fail(this.errors.load);
    }
  }

  async deactivate(id) {
    try {
      await this.service.deactivate(id);
      await this.load();
    } catch {
      UiStore.fail(this.errors.deactivate);
    }
  }

  async reactivate(id) {
    try {
      await this.service.reactivate(id);
      await this.load();
    } catch {
      UiStore.fail(this.errors.reactivate);
    }
  }
}
