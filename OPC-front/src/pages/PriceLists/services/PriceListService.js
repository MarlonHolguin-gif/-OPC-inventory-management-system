import { HttpClient } from '@/services/http/HttpClient';

export class PriceListService {
  static list() {
    return HttpClient.get('/api/price-lists').then((r) => r.data);
  }

  static create(payload) {
    return HttpClient.post('/api/price-lists', payload).then((r) => r.data);
  }

  static update(id, payload) {
    return HttpClient.put(`/api/price-lists/${id}`, payload).then((r) => r.data);
  }

  static deactivate(id) {
    return HttpClient.patch(`/api/price-lists/${id}/deactivate`);
  }

  static reactivate(id) {
    return HttpClient.patch(`/api/price-lists/${id}/reactivate`);
  }

  static upsertItem(listId, payload) {
    return HttpClient.post(`/api/price-lists/${listId}/items`, payload);
  }

  static removeItem(listId, productId) {
    return HttpClient.delete(`/api/price-lists/${listId}/items/${productId}`);
  }

  static productCatalog() {
    return HttpClient.get('/api/products/catalog').then((r) => r.data);
  }
}
