import { signal, computed } from '@preact/signals-react';
import { Controller } from '@/lib/Controller';
import { BranchDirectoryStore } from '@/stores/BranchDirectoryStore';
import { UiStore } from '@/stores/UiStore';
import { TransferService } from '../services/TransferService';
import { TRANSFER_HISTORY_STATUSES } from '../constants';

const EMPTY_FILTERS = {
  number: '',
  originBranchId: '',
  destinationBranchId: '',
  status: '',
  from: '',
  to: '',
};

const HISTORY_ORDER = Object.fromEntries(TRANSFER_HISTORY_STATUSES.map((status, index) => [status, index]));

/**
 * Pestaña "Histórico" de transferencias: la lista de recibidas (completas y
 * parciales) con filtros en fila + el cumplimiento logístico (que se abre en
 * un modal). El rango de fechas consulta el reporte en el servidor; el resto
 * de filtros son cliente.
 */
export class TransferHistoryController extends Controller {
  transfers = signal([]);
  complianceRows = signal([]);
  filters = signal({ ...EMPTY_FILTERS });
  loading = signal(true);
  searching = signal(false);

  branchNames = computed(() =>
    Object.fromEntries(BranchDirectoryStore.all.value.map((b) => [b.id, b.name])),
  );

  branchCodes = computed(() =>
    Object.fromEntries(BranchDirectoryStore.all.value.map((b) => [b.id, b.code])),
  );

  rows = computed(() => {
    const f = this.filters.value;
    const number = f.number.trim().toLowerCase();
    return this.transfers.value
      .filter((transfer) => TRANSFER_HISTORY_STATUSES.includes(transfer.status))
      .filter((transfer) => !f.status || transfer.status === f.status)
      .filter((transfer) => !f.originBranchId || String(transfer.originBranchId) === String(f.originBranchId))
      .filter(
        (transfer) =>
          !f.destinationBranchId || String(transfer.destinationBranchId) === String(f.destinationBranchId),
      )
      .filter((transfer) => !number || transfer.transferNumber.toLowerCase().includes(number))
      .sort((a, b) => {
        const byStatus = HISTORY_ORDER[a.status] - HISTORY_ORDER[b.status];
        if (byStatus !== 0) return byStatus;
        return new Date(b.requestDate) - new Date(a.requestDate);
      });
  });

  totalConsidered = computed(() =>
    this.complianceRows.value.reduce((sum, row) => sum + row.totalTransfers, 0),
  );

  branchName(id) {
    return BranchDirectoryStore.nameOf(id) ?? id;
  }

  async onMount() {
    try {
      const [transfers, complianceRows] = await Promise.all([
        TransferService.list(),
        TransferService.complianceReport({}),
        BranchDirectoryStore.ensureLoaded(),
      ]);
      this.transfers.value = transfers;
      this.complianceRows.value = complianceRows;
    } catch {
      UiStore.fail('No se pudo cargar el histórico de transferencias.');
    } finally {
      this.loading.value = false;
    }
  }

  setFilter = (key, value) => {
    this.filters.value = { ...this.filters.value, [key]: value };
  };

  clearFilters = () => {
    this.filters.value = { ...EMPTY_FILTERS };
    return this.search();
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
      this.complianceRows.value = await TransferService.complianceReport(params);
    } catch {
      UiStore.fail('No se pudo consultar el cumplimiento logístico.');
    } finally {
      this.searching.value = false;
    }
  }
}
