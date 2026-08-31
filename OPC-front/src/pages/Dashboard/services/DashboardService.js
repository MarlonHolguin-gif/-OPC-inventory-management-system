import { HttpClient } from '@/services/http/HttpClient';

export class DashboardService {
  static salesTrend(branchId) {
    return HttpClient.get('/api/dashboard/sales-trend', { params: { branchId } }).then((r) => r.data);
  }

  static inventoryRotation(branchId) {
    return HttpClient.get('/api/dashboard/inventory-rotation', { params: { branchId } }).then((r) => r.data);
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
