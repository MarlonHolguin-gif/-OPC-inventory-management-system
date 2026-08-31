import { HttpClient } from '@/services/http/HttpClient';

export class BranchService {
  static list() {
    return HttpClient.get('/api/branches').then((r) => r.data);
  }

  static create(payload) {
    return HttpClient.post('/api/branches', payload).then((r) => r.data);
  }

  static update(id, payload) {
    return HttpClient.put(`/api/branches/${id}`, payload).then((r) => r.data);
  }

  static deactivate(id) {
    return HttpClient.patch(`/api/branches/${id}/deactivate`);
  }
}
