import { signal } from '@preact/signals-react';
import { Controller } from '@/lib/Controller';
import { UiStore } from '@/stores/UiStore';
import { PurchaseService } from '../services/PurchaseService';

const EMPTY_FILTERS = { supplierId: '', productId: '', from: '', to: '' };

/**
 * Histórico de compras: una fila por producto comprado, filtrable por
 * proveedor, producto y rango de fechas. Solo lectura.
 */
export class PurchaseHistoryController extends Controller {
  suppliers = signal([]);
  products = signal([]);
  filters = signal({ ...EMPTY_FILTERS });
  rows = signal([]);
  loading = signal(true);
  searching = signal(false);

  async onMount() {
    try {
      const [suppliers, products, rows] = await Promise.all([
        PurchaseService.suppliers(),
        PurchaseService.productCatalog(),
        PurchaseService.history({}),
      ]);
      this.suppliers.value = suppliers;
      this.products.value = products;
      this.rows.value = rows;
    } catch {
      UiStore.fail('No se pudo cargar el histórico de compras.');
    } finally {
      this.loading.value = false;
    }
  }

  setFilter = (key, value) => {
    this.filters.value = { ...this.filters.value, [key]: value };
  };

  clearFilters = () => {
    this.filters.value = { ...EMPTY_FILTERS };
  };

  async search(event) {
    event?.preventDefault();
    UiStore.clear();
    this.searching.value = true;
    try {
      const currentFilters = this.filters.value;
      const params = {};
      if (currentFilters.supplierId) params.supplierId = currentFilters.supplierId;
      if (currentFilters.productId) params.productId = currentFilters.productId;
      if (currentFilters.from) params.from = `${currentFilters.from}T00:00:00`;
      if (currentFilters.to) params.to = `${currentFilters.to}T23:59:59`;
      this.rows.value = await PurchaseService.history(params);
    } catch {
      UiStore.fail('No se pudo consultar el histórico de compras.');
    } finally {
      this.searching.value = false;
    }
  }
}
