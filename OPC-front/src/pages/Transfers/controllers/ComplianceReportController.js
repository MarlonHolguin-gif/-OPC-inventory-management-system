import { signal, computed } from '@preact/signals-react';
import { Controller } from '@/lib/Controller';
import { BranchDirectoryStore } from '@/stores/BranchDirectoryStore';
import { UiStore } from '@/stores/UiStore';
import { TransferService } from '../services/TransferService';

const EMPTY_FILTERS = { from: '', to: '' };

/**
 * Reporte de cumplimiento logístico: % de transferencias que llegaron a
 * destino antes o en la fecha estimada, por sucursal origen y prioridad de
 * ruta.
 */
export class ComplianceReportController extends Controller {
  rows = signal([]);
  filters = signal({ ...EMPTY_FILTERS });
  loading = signal(true);
  searching = signal(false);

  branchNames = computed(() =>
    Object.fromEntries(BranchDirectoryStore.all.value.map((b) => [b.id, b.name])),
  );

  branchCodes = computed(() =>
    Object.fromEntries(BranchDirectoryStore.all.value.map((b) => [b.id, b.code])),
  );

  totalConsidered = computed(() =>
    this.rows.value.reduce((sum, row) => sum + row.totalTransfers, 0),
  );

  async onMount() {
    try {
      const [rows] = await Promise.all([
        TransferService.complianceReport({}),
        BranchDirectoryStore.ensureLoaded(),
      ]);
      this.rows.value = rows;
    } catch {
      UiStore.fail('No se pudo cargar el reporte.');
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
      const { from, to } = this.filters.value;
      const params = {};
      if (from) params.from = `${from}T00:00:00`;
      if (to) params.to = `${to}T23:59:59`;
      this.rows.value = await TransferService.complianceReport(params);
    } catch {
      UiStore.fail('No se pudo consultar el reporte de cumplimiento.');
    } finally {
      this.searching.value = false;
    }
  }
}
