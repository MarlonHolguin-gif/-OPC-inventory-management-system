import { HttpClient } from '@/services/http/HttpClient';

export class NotificationService {
  static list() {
    return HttpClient.get('/api/notificaciones').then((r) => r.data);
  }

  static markRead(id) {
    return HttpClient.patch(`/api/notificaciones/${id}/leida`).then((r) => r.data);
  }
}
