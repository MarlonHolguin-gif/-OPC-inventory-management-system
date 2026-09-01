import { HttpClient } from '@/services/http/HttpClient';

export class DashboardService {
  static salesTrend(branchId) {
    return HttpClient.get('/api/dashboard/sales-trend', { params: { branchId } }).then((r) => r.data);
  }

  // order: 'DESC' (alta demanda) | 'ASC' (baja demanda). from/to: ISO date-time opcionales.
  static inventoryRotation(branchId, { order, from, to } = {}) {
    const params = { branchId };
    if (order) params.order = order;
    if (from) params.from = from;
    if (to) params.to = to;
    return HttpClient.get('/api/dashboard/inventory-rotation', { params }).then((r) => r.data);
  }

  static activeTransfersImpact(branchId) {
    return HttpClient.get('/api/dashboard/active-transfers-impact', { params: { branchId } }).then(
      (r) => r.data,
    );
  }

  static lowStock(branchId) {
    return HttpClient.get('/api/dashboard/low-stock', { params: { branchId } }).then((r) => r.data);
  }

  static branchComparison() {
    return HttpClient.get('/api/dashboard/branch-comparison').then((r) => r.data);
  }
}
