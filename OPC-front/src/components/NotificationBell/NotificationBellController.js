import { signal, computed } from '@preact/signals-react';
import { PollingController } from '@/lib/PollingController';
import { BranchDirectoryStore } from '@/stores/BranchDirectoryStore';
import { NotificationService } from './NotificationService';
import { notificationLink } from './constants';

/**
 * Campana de notificaciones del riel: contador de no leídas + filtro por
 * tipo. Se auto-refresca cada 20s (nunca recarga la página). Al pulsar una
 * notificación se marca leída y se navega a la vista donde se atiende (ver
 * `notificationLink`); la navegación real la hace el hook `useRedirect` en
 * el componente, el controller solo publica el destino en un signal.
 */
export class NotificationBellController extends PollingController {
  intervalMs = 20000;

  notifications = signal(null); // null = todavía no cargó ni una vez
  open = signal(false);
  typeFilter = signal(''); // '' = todos los tipos
  redirect = signal(null); // { path } que consume useRedirect

  list = computed(() => this.notifications.value ?? []);
  // El contador de la campana es sobre TODAS las no leídas, no sobre el filtro.
  unreadCount = computed(() => this.list.value.filter((n) => n.status !== 'READ').length);
  filteredList = computed(() => {
    const type = this.typeFilter.value;
    return type ? this.list.value.filter((n) => n.type === type) : this.list.value;
  });

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

  itemClick(notification) {
    if (notification.status !== 'READ') {
      // Marca leída al instante en la lista local; el servidor en segundo
      // plano (el próximo refresco corrige si la petición falló).
      this.notifications.value = (this.notifications.value ?? []).map((item) =>
        item.id === notification.id ? { ...item, status: 'READ' } : item,
      );
      NotificationService.markRead(notification.id).catch(() => {});
    }

    this.closePanel();
    const path = notificationLink(notification);
    if (path) this.redirect.value = { path };
  }
}
