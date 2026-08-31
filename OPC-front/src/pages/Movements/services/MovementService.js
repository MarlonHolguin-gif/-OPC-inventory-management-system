import { HttpClient } from '@/services/http/HttpClient';

export class MovementService {
  static create(payload) {
    return HttpClient.post('/api/inventario/movimientos', payload);
  }

  static productCatalog() {
    return HttpClient.get('/api/products/catalog').then((r) => r.data);
  }
}
