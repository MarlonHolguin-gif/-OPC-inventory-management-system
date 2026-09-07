import { signal, computed } from '@preact/signals-react';
import { Controller } from '@/lib/Controller';
import { UiStore } from '@/stores/UiStore';
import { BranchDirectoryStore } from '@/stores/BranchDirectoryStore';
import { PurchaseService } from '../services/PurchaseService';

const EMPTY_FILTERS = { supplierId: '', productId: '', status: '', from: '', to: '' };

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
  page = signal(0);
  pageSize = signal(10); // lo ajusta la página según el alto disponible

  // El histórico se pagina (Pager "1–N de M" + flechas), sin scroll.
  pageCount = computed(() => Math.max(1, Math.ceil(this.rows.value.length / this.pageSize.value)));
  currentPage = computed(() => Math.min(this.page.value, this.pageCount.value - 1));
  pageRows = computed(() => {
    const size = this.pageSize.value;
    const start = this.currentPage.value * size;
    return this.rows.value.slice(start, start + size);
  });

  setPage = (page) => {
    this.page.value = page;
  };

  setPageSize = (size) => {
    this.pageSize.value = size;
  };

  async onMount() {
    try {
      const [suppliers, products, rows] = await Promise.all([
        PurchaseService.suppliers(),
        PurchaseService.productCatalog(),
        PurchaseService.history({}),
        BranchDirectoryStore.ensureLoaded(),
      ]);
      this.suppliers.value = suppliers;
      this.products.value = products;
      this.rows.value = rows;
      this.page.value = 0;
    } catch {
      UiStore.fail('No se pudo cargar el histórico de compras.');
    } finally {
      this.loading.value = false;
    }
  }

  branchName(id) {
    return BranchDirectoryStore.nameOf(id) ?? `Sucursal ${id}`;
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
      if (currentFilters.status) params.status = currentFilters.status;
      if (currentFilters.from) params.from = `${currentFilters.from}T00:00:00`;
      if (currentFilters.to) params.to = `${currentFilters.to}T23:59:59`;
      this.rows.value = await PurchaseService.history(params);
      this.page.value = 0;
    } catch {
      UiStore.fail('No se pudo consultar el histórico de compras.');
    } finally {
      this.searching.value = false;
    }
  }
}
