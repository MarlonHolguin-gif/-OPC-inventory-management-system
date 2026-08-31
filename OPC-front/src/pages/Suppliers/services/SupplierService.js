import { HttpClient } from '@/services/http/HttpClient';

export class SupplierService {
  static list() {
    return HttpClient.get('/api/suppliers').then((r) => r.data);
  }

  static create(payload) {
    return HttpClient.post('/api/suppliers', payload).then((r) => r.data);
  }

  static update(id, payload) {
    return HttpClient.put(`/api/suppliers/${id}`, payload).then((r) => r.data);
  }

  static deactivate(id) {
    return HttpClient.patch(`/api/suppliers/${id}/deactivate`);
  }

  static reactivate(id) {
    return HttpClient.patch(`/api/suppliers/${id}/reactivate`);
  }
}
