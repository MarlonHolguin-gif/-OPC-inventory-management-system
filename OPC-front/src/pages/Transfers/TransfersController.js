import { signal, computed } from '@preact/signals-react';
import { PollingController } from '@/lib/PollingController';
import { AuthStore } from '@/stores/AuthStore';
import { BranchDirectoryStore } from '@/stores/BranchDirectoryStore';
import { GENERAL_ADMIN } from '@/constants/roles';
import { TransferService } from './services/TransferService';
import { TransferFormController } from './controllers/TransferFormController';
import { TRANSFER_STATUS_LABELS } from './constants';

// Orden de las secciones del panel: primero lo que todavía necesita acción,
// después lo ya resuelto.
const SECTION_ORDER = [
  'REQUESTED',
  'IN_PREPARATION',
  'IN_TRANSIT',
  'PARTIALLY_RECEIVED',
  'FULLY_RECEIVED',
  'CANCELLED',
];

/**
 * Panel de transferencias entre sucursales. Se auto-refresca cada 20 s sin
 * recargar la página ni volver a mostrar "Cargando…".
 */
export class TransfersController extends PollingController {
  intervalMs = 20000;

  // null = todavía no cargó ni una vez ("Cargando…" de pantalla completa).
  transfers = signal(null);
  lastUpdated = signal(null);
  refreshing = signal(false);
  // '' = sin filtro; si no, HIGH/MEDIUM/LOW (clasificación de ruta, 3.5).
  routePriorityFilter = signal('');

  form = new TransferFormController(this);

  isAdmin = computed(() => AuthStore.role.value === GENERAL_ADMIN);

  sections = computed(() => {
    const rows = this.transfers.value ?? [];
    return SECTION_ORDER.map((status) => ({
      status,
      label: TRANSFER_STATUS_LABELS[status],
      items: rows.filter((transfer) => transfer.status === status),
    })).filter((section) => section.items.length > 0);
  });

  branchName(id) {
    return BranchDirectoryStore.nameOf(id) ?? id;
  }

  setRoutePriorityFilter = (value) => {
    this.routePriorityFilter.value = value;
    this.tick();
  };

  async tick() {
    this.refreshing.value = true;
    try {
      const [transfers] = await Promise.all([
        TransferService.list(this.routePriorityFilter.value || undefined),
        BranchDirectoryStore.ensureLoaded(),
      ]);
      this.transfers.value = transfers;
      this.lastUpdated.value = new Date();
    } finally {
      this.refreshing.value = false;
    }
  }
}
