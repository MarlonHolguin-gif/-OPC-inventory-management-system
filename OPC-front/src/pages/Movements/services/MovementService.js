import { HttpClient } from '@/services/http/HttpClient';

export class MovementService {
  static create(payload) {
    return HttpClient.post('/api/inventario/movimientos', payload);
  }

  // Historial de movimientos, ya acotado por sucursal según el rol en el
  // backend. `params` acepta branchId, productId, movementType, from, to.
  static history(params) {
    return HttpClient.get('/api/inventario/movimientos', { params }).then((r) => r.data);
  }

  static productCatalog() {
    return HttpClient.get('/api/products/catalog').then((r) => r.data);
  }
}
