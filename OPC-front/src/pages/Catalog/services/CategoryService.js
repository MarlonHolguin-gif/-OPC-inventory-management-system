import { HttpClient } from '@/services/http/HttpClient';

export class CategoryService {
  static list() {
    return HttpClient.get('/api/categories').then((r) => r.data);
  }

  static create(payload) {
    return HttpClient.post('/api/categories', payload).then((r) => r.data);
  }

  static update(id, payload) {
    return HttpClient.put(`/api/categories/${id}`, payload).then((r) => r.data);
  }

  static deactivate(id) {
    return HttpClient.patch(`/api/categories/${id}/deactivate`);
  }

  static reactivate(id) {
    return HttpClient.patch(`/api/categories/${id}/reactivate`);
  }
}
