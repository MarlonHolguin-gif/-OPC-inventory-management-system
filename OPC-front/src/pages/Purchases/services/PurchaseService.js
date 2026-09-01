import { HttpClient } from '@/services/http/HttpClient';

export class PurchaseService {
  static list() {
    return HttpClient.get('/api/purchase-orders').then((r) => r.data);
  }

  static get(id) {
    return HttpClient.get(`/api/purchase-orders/${id}`).then((r) => r.data);
  }

  static history(params) {
    return HttpClient.get('/api/purchase-orders/history', { params }).then((r) => r.data);
  }

  static create(payload) {
    return HttpClient.post('/api/purchase-orders', payload).then((r) => r.data);
  }

  static update(id, payload) {
    return HttpClient.put(`/api/purchase-orders/${id}`, payload).then((r) => r.data);
  }

  static markAsSent(id) {
    return HttpClient.patch(`/api/purchase-orders/${id}/send`).then((r) => r.data);
  }

  static cancel(id) {
    return HttpClient.patch(`/api/purchase-orders/${id}/cancel`).then((r) => r.data);
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

  // Unidades alternativas de un producto (para comprar en cajas, etc.).
  static productUnits(productId) {
    return HttpClient.get(`/api/products/${productId}/units`).then((r) => r.data);
  }
}
