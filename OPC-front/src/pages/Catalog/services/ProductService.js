import { HttpClient } from '@/services/http/HttpClient';

export class ProductService {
  static list() {
    return HttpClient.get('/api/products').then((r) => r.data);
  }

  static create(payload) {
    return HttpClient.post('/api/products', payload).then((r) => r.data);
  }

  static update(id, payload) {
    return HttpClient.put(`/api/products/${id}`, payload).then((r) => r.data);
  }

  static deactivate(id) {
    return HttpClient.patch(`/api/products/${id}/deactivate`);
  }

  static reactivate(id) {
    return HttpClient.patch(`/api/products/${id}/reactivate`);
  }
}
