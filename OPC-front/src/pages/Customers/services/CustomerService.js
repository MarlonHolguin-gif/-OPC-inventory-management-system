import { HttpClient } from '@/services/http/HttpClient';

export class CustomerService {
  static list() {
    return HttpClient.get('/api/customers').then((r) => r.data);
  }

  static create(payload) {
    return HttpClient.post('/api/customers', payload).then((r) => r.data);
  }

  static update(id, payload) {
    return HttpClient.put(`/api/customers/${id}`, payload).then((r) => r.data);
  }

  static deactivate(id) {
    return HttpClient.patch(`/api/customers/${id}/deactivate`);
  }

  static reactivate(id) {
    return HttpClient.patch(`/api/customers/${id}/reactivate`);
  }
}
