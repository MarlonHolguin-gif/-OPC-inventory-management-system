import { HttpClient } from '@/services/http/HttpClient';

export class PurchaseService {
  static list() {
    return HttpClient.get('/api/purchase-orders').then((r) => r.data);
  }

  static get(id) {
    return HttpClient.get(`/api/purchase-orders/${id}`).then((r) => r.data);
  }

  static create(payload) {
    return HttpClient.post('/api/purchase-orders', payload).then((r) => r.data);
  }

  static registerReceipt(id, payload) {
    return HttpClient.post(`/api/purchase-orders/${id}/receipts`, payload);
  }

  // Datos de referencia que consume el formulario de órdenes.
  static suppliers() {
    return HttpClient.get('/api/suppliers').then((r) => r.data);
  }

  static productCatalog() {
    return HttpClient.get('/api/products/catalog').then((r) => r.data);
  }
}
