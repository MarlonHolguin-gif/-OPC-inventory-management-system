import { signal, computed } from '@preact/signals-react';
import { PollingController } from '@/lib/PollingController';
import { AuthStore } from '@/stores/AuthStore';
import { BranchDirectoryStore } from '@/stores/BranchDirectoryStore';
import { GENERAL_ADMIN } from '@/constants/roles';
import { TransferService } from './services/TransferService';
import { TransferFormController } from './controllers/TransferFormController';

/**
 * Módulo de transferencias entre sucursales, en dos pestañas: "Transferencias"
 * (en curso, con sub-filtro por estado) e "Histórico". Se auto-refresca cada
 * 20 s sin recargar la página.
 */
export class TransfersController extends PollingController {
  intervalMs = 20000;

  // null = todavía no cargó ni una vez.
  transfers = signal(null);
  lastUpdated = signal(null);
  refreshing = signal(false);
  activeTab = signal('transfers');
  activeStatus = signal('REQUESTED');

  form = new TransferFormController(this);

  isAdmin = computed(() => AuthStore.role.value === GENERAL_ADMIN);

  rowsForStatus(status) {
    return (this.transfers.value ?? []).filter((transfer) => transfer.status === status);
  }

  countForStatus(status) {
    return this.rowsForStatus(status).length;
  }

  branchName(id) {
    return BranchDirectoryStore.nameOf(id) ?? id;
  }

  setTab = (id) => {
    this.activeTab.value = id;
  };

  setActiveStatus = (id) => {
    this.activeStatus.value = id;
  };

  async tick() {
    this.refreshing.value = true;
    try {
      const [transfers] = await Promise.all([
        TransferService.list(),
        BranchDirectoryStore.ensureLoaded(),
      ]);
      this.transfers.value = transfers;
      this.lastUpdated.value = new Date();
    } finally {
      this.refreshing.value = false;
    }
  }
}
