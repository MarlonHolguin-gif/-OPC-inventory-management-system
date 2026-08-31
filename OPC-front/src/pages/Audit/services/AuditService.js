import { HttpClient } from '@/services/http/HttpClient';

export class AuditService {
  // GET /api/auditoria — devuelve un Page de Spring
  // ({ content, number, size, totalElements, totalPages, first, last }).
  static search(params) {
    return HttpClient.get('/api/auditoria', { params }).then((r) => r.data);
  }

  // Para el filtro por responsable y para mostrar el nombre en vez del id.
  static users() {
    return HttpClient.get('/api/users').then((r) => r.data);
  }
}
