import { signal, computed } from '@preact/signals-react';
import { Controller } from '@/lib/Controller';
import { BranchDirectoryStore } from '@/stores/BranchDirectoryStore';
import { UiStore } from '@/stores/UiStore';
import { SaleService } from './services/SaleService';
import { SaleFormController } from './controllers/SaleFormController';

const EMPTY_FILTERS = { saleNumber: '', branchId: '', customerId: '', from: '', to: '' };

/**
 * Módulo Ventas: histórico consultable + registro de una venta en modal.
 */
export class SalesController extends Controller {
  customers = signal([]);
  filters = signal({ ...EMPTY_FILTERS });
  results = signal([]);
  loading = signal(true);
  searching = signal(false);
  page = signal(0);
  pageSize = signal(10); // lo ajusta la página según el alto disponible

  form = new SaleFormController(this);

  // El backend no filtra por número de venta — se filtra en el cliente.
  filteredResults = computed(() => {
    const term = this.filters.value.saleNumber.trim().toLowerCase();
    if (!term) return this.results.value;
    return this.results.value.filter((row) => String(row.saleNumber).toLowerCase().includes(term));
  });

  // El histórico se pagina (Pager "1–N de M" + flechas), sin scroll.
  pageCount = computed(() =>
    Math.max(1, Math.ceil(this.filteredResults.value.length / this.pageSize.value)),
  );
  currentPage = computed(() => Math.min(this.page.value, this.pageCount.value - 1));
  pageRows = computed(() => {
    const size = this.pageSize.value;
    const start = this.currentPage.value * size;
    return this.filteredResults.value.slice(start, start + size);
  });

  setPage = (page) => {
    this.page.value = page;
  };

  setPageSize = (size) => {
    this.pageSize.value = size;
  };

  branchName(id) {
    return BranchDirectoryStore.nameOf(id) ?? '—';
  }

  async onMount() {
    try {
      const [customers, results] = await Promise.all([
        SaleService.customers(),
        SaleService.history({}),
        BranchDirectoryStore.ensureLoaded(),
      ]);
      this.customers.value = customers;
      this.results.value = results;
    } catch {
      UiStore.fail('No se pudo cargar el histórico de ventas.');
    } finally {
      this.loading.value = false;
    }
  }

  setFilter = (key, value) => {
    this.filters.value = { ...this.filters.value, [key]: value };
    // El número de venta filtra en vivo: al cambiarlo, vuelve a la página 1.
    if (key === 'saleNumber') this.page.value = 0;
  };

  clearFilters = () => {
    this.filters.value = { ...EMPTY_FILTERS };
  };

  async search(event) {
    event?.preventDefault();
    UiStore.clear();
    this.searching.value = true;
    try {
      const f = this.filters.value;
      const params = {};
      if (f.branchId) params.branchId = f.branchId;
      if (f.customerId) params.customerId = f.customerId;
      if (f.from) params.from = `${f.from}T00:00:00`;
      if (f.to) params.to = `${f.to}T23:59:59`;
      this.results.value = await SaleService.history(params);
      this.page.value = 0;
    } catch {
      UiStore.fail('No se pudo consultar el histórico de ventas.');
    } finally {
      this.searching.value = false;
    }
  }

  // Re-ejecuta la consulta con los filtros actuales (tras registrar una venta).
  refresh() {
    return this.search();
  }
}
