import { signal, computed } from '@preact/signals-react';
import { PollingController } from '@/lib/PollingController';
import { BranchDirectoryStore } from '@/stores/BranchDirectoryStore';
import { NotificationService } from './NotificationService';

/**
 * Campana de notificaciones del riel: contador de no leídas + detalle al
 * hacer clic. Se auto-refresca cada 20s (nunca recarga la página).
 */
export class NotificationBellController extends PollingController {
  intervalMs = 20000;

  notifications = signal(null); // null = todavía no cargó ni una vez
  open = signal(false);
  expandedId = signal(null);
  typeFilter = signal(''); // '' = todos los tipos

  list = computed(() => this.notifications.value ?? []);
  // El contador de la campana es sobre TODAS las no leídas, no sobre el filtro.
  unreadCount = computed(() => this.list.value.filter((n) => n.status !== 'READ').length);
  filteredList = computed(() => {
    const type = this.typeFilter.value;
    return type ? this.list.value.filter((n) => n.type === type) : this.list.value;
  });

  branchName(id) {
    return BranchDirectoryStore.nameOf(id) ?? id;
  }

  async tick() {
    const [notifications] = await Promise.all([
      NotificationService.list(),
      BranchDirectoryStore.ensureLoaded(),
    ]);
    this.notifications.value = notifications;
  }

  setTypeFilter = (value) => {
    this.typeFilter.value = value;
  };

  toggleOpen = () => {
    this.open.value = !this.open.value;
  };

  closePanel = () => {
    this.open.value = false;
  };

  async itemClick(notification) {
    this.expandedId.value =
      this.expandedId.value === notification.id ? null : notification.id;
    if (notification.status === 'READ') return;
    try {
      const updated = await NotificationService.markRead(notification.id);
      this.notifications.value = this.notifications.value.map((item) =>
        item.id === notification.id ? updated : item,
      );
    } catch {
      // el detalle ya se mostró — el próximo refresco reintenta el marcado
    }
  }
}
