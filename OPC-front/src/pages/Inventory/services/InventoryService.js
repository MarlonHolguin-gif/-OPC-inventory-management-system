import { HttpClient } from '@/services/http/HttpClient';

export class InventoryService {
  static productCatalog() {
    return HttpClient.get('/api/products/catalog').then((r) => r.data);
  }

  static branchStock(branchId) {
    return HttpClient.get(`/api/inventario/sucursal/${branchId}`).then((r) => r.data);
  }
}
