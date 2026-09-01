import { signal } from '@preact/signals-react';
import { Controller } from '@/lib/Controller';
import { UiStore } from '@/stores/UiStore';
import { PurchaseService } from './services/PurchaseService';
import { PurchaseOrderFormController } from './controllers/PurchaseOrderFormController';

export class PurchaseOrdersController extends Controller {
  orders = signal([]);
  loading = signal(true);

  form = new PurchaseOrderFormController(this);

  async onMount() {
    await this.load();
    this.loading.value = false;
  }

  async load() {
    try {
      this.orders.value = await PurchaseService.list();
    } catch {
      UiStore.fail('No se pudo cargar las órdenes de compra.');
    }
  }
}
