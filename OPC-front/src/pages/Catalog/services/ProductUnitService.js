import { HttpClient } from '@/services/http/HttpClient';

// Unidades alternativas de un producto (factores de conversión).
export class ProductUnitService {
  static list(productId) {
    return HttpClient.get(`/api/products/${productId}/units`).then((r) => r.data);
  }

  static upsert(productId, payload) {
    return HttpClient.post(`/api/products/${productId}/units`, payload).then((r) => r.data);
  }

  static remove(productId, unitId) {
    return HttpClient.delete(`/api/products/${productId}/units/${unitId}`);
  }
}
