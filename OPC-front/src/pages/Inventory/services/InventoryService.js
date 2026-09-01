import { HttpClient } from '@/services/http/HttpClient';

export class InventoryService {
  static productCatalog() {
    return HttpClient.get('/api/products/catalog').then((r) => r.data);
  }

  static branchStock(branchId) {
    return HttpClient.get(`/api/inventario/sucursal/${branchId}`).then((r) => r.data);
  }

  // Fija el stock mínimo/máximo de un producto en una sucursal (RF-05).
  static updateThresholds(branchId, productId, payload) {
    return HttpClient.put(
      `/api/inventario/sucursal/${branchId}/producto/${productId}/umbrales`,
      payload,
    ).then((r) => r.data);
  }
}
