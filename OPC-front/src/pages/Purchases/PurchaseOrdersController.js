import { signal, computed } from '@preact/signals-react';
import { Controller } from '@/lib/Controller';
import { UiStore } from '@/stores/UiStore';
import { BranchDirectoryStore } from '@/stores/BranchDirectoryStore';
import { PurchaseService } from './services/PurchaseService';
import { PURCHASE_ORDER_VIEWS } from './constants';
import { PurchaseOrderFormController } from './controllers/PurchaseOrderFormController';

export class PurchaseOrdersController extends Controller {
  orders = signal([]);
  loading = signal(true);
  // Vista de estado seleccionada (segmentado encima de la tabla).
  statusView = signal(PURCHASE_ORDER_VIEWS[0].id);

  form = new PurchaseOrderFormController(this);

  filteredOrders = computed(() => {
    const view = PURCHASE_ORDER_VIEWS.find((candidate) => candidate.id === this.statusView.value);
    if (!view) return [];
    return this.orders.value.filter((order) => view.statuses.includes(order.status));
  });

  countFor(viewId) {
    const view = PURCHASE_ORDER_VIEWS.find((candidate) => candidate.id === viewId);
    if (!view) return 0;
    return this.orders.value.filter((order) => view.statuses.includes(order.status)).length;
  }

  setStatusView = (id) => {
    this.statusView.value = id;
  };

  branchName(id) {
    return BranchDirectoryStore.nameOf(id) ?? `Sucursal ${id}`;
  }

  async onMount() {
    await this.load();
    this.loading.value = false;
  }

  async load() {
    try {
      const [orders] = await Promise.all([
        PurchaseService.list(),
        BranchDirectoryStore.ensureLoaded(),
      ]);
      this.orders.value = orders;
    } catch {
      UiStore.fail('No se pudo cargar las órdenes de compra.');
    }
  }
}
