import { HttpClient } from '@/services/http/HttpClient';

export class TransferService {
  static list() {
    return HttpClient.get('/api/transfers').then((r) => r.data);
  }

  static get(id) {
    return HttpClient.get(`/api/transfers/${id}`).then((r) => r.data);
  }

  static events(id) {
    return HttpClient.get(`/api/transfers/${id}/events`).then((r) => r.data);
  }

  static create(payload) {
    return HttpClient.post('/api/transfers', payload).then((r) => r.data);
  }

  static prepare(id, items) {
    return HttpClient.post(`/api/transfers/${id}/prepare`, { items });
  }

  static dispatch(id, payload) {
    return HttpClient.post(`/api/transfers/${id}/dispatch`, payload);
  }

  static receiveComplete(id) {
    return HttpClient.post(`/api/transfers/${id}/receive-complete`);
  }

  static receivePartial(id, items) {
    return HttpClient.post(`/api/transfers/${id}/receive-partial`, { items });
  }

  static resolveShortage(id, payload) {
    return HttpClient.post(`/api/transfers/${id}/resolve-shortage`, payload).then((r) => r.data);
  }

  static complianceReport(params) {
    return HttpClient.get('/api/transfers/reports/compliance', { params }).then((r) => r.data);
  }

  // Catálogo de productos para el formulario de solicitud (endpoint compartido
  // por varios módulos; aquí solo se usa el que necesita Transferencias).
  static productCatalog() {
    return HttpClient.get('/api/products/catalog').then((r) => r.data);
  }
}
