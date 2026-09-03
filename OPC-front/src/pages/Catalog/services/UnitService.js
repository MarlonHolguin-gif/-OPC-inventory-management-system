import { HttpClient } from '@/services/http/HttpClient';

export class UnitService {
  static list() {
    return HttpClient.get('/api/units').then((r) => r.data);
  }

  static create(payload) {
    return HttpClient.post('/api/units', payload).then((r) => r.data);
  }

  static update(id, payload) {
    return HttpClient.put(`/api/units/${id}`, payload).then((r) => r.data);
  }

  static deactivate(id) {
    return HttpClient.patch(`/api/units/${id}/deactivate`);
  }

  static reactivate(id) {
    return HttpClient.patch(`/api/units/${id}/reactivate`);
  }

  static remove(id) {
    return HttpClient.delete(`/api/units/${id}`);
  }
}
