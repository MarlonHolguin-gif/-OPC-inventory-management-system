import { HttpClient } from '@/services/http/HttpClient';

export class UserService {
  static list() {
    return HttpClient.get('/api/users').then((r) => r.data);
  }

  // UserResponse no trae las sucursales asignadas — se piden aparte por usuario.
  static branchesOf(userId) {
    return HttpClient.get(`/api/users/${userId}/branches`).then((r) => r.data);
  }

  static create(payload) {
    return HttpClient.post('/api/users', payload).then((r) => r.data);
  }

  static update(id, payload) {
    return HttpClient.put(`/api/users/${id}`, payload).then((r) => r.data);
  }

  static deactivate(id) {
    return HttpClient.patch(`/api/users/${id}/deactivate`);
  }

  static reactivate(id) {
    return HttpClient.patch(`/api/users/${id}/reactivate`);
  }

  static assignBranch(userId, branchId) {
    return HttpClient.put(`/api/users/${userId}/branches/${branchId}`);
  }

  static unassignBranch(userId, branchId) {
    return HttpClient.delete(`/api/users/${userId}/branches/${branchId}`);
  }
}
