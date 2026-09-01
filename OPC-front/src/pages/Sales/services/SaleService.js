import { HttpClient } from '@/services/http/HttpClient';

export class SaleService {
  static create(payload) {
    return HttpClient.post('/api/sales', payload).then((r) => r.data);
  }

  static history(params) {
    return HttpClient.get('/api/sales/history', { params }).then((r) => r.data);
  }

  static get(id) {
    return HttpClient.get(`/api/sales/${id}`).then((r) => r.data);
  }

  // Datos de referencia que el módulo de ventas necesita para los formularios
  // (endpoints compartidos; aquí solo lo que consume Ventas).
  static productCatalog() {
    return HttpClient.get('/api/products/catalog').then((r) => r.data);
  }

  static priceLists() {
    return HttpClient.get('/api/price-lists').then((r) => r.data);
  }

  static customers() {
    return HttpClient.get('/api/customers').then((r) => r.data);
  }

  static sellers() {
    return HttpClient.get('/api/users').then((r) => r.data);
  }

  static branchInventory(branchId) {
    return HttpClient.get(`/api/inventario/sucursal/${branchId}`).then((r) => r.data);
  }
}
