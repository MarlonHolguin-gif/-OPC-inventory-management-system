import { signal, computed } from '@preact/signals-react';
import { Controller } from '@/lib/Controller';
import { AuthStore } from '@/stores/AuthStore';
import { BranchDirectoryStore } from '@/stores/BranchDirectoryStore';
import { UiStore } from '@/stores/UiStore';
import { GENERAL_ADMIN } from '@/constants/roles';
import { DashboardService } from './services/DashboardService';

/**
 * Panel gerencial: 4 KPIs por sucursal (tendencia de ventas, rotación,
 * impacto de transferencias activas, stock bajo) + comparativa entre
 * sucursales (solo admin).
 */
export class DashboardController extends Controller {
  branchId = signal('');
  salesTrend = signal(null);
  rotation = signal(null);
  transfersImpact = signal(null);
  lowStock = signal(null);
  comparison = signal(null);
  loading = signal(true);

  isAdmin = computed(() => AuthStore.role.value === GENERAL_ADMIN);

  availableBranches = computed(() => {
    const own = AuthStore.branches.value;
    const all = BranchDirectoryStore.all.value;
    return Array.isArray(own) ? all.filter((branch) => own.includes(branch.id)) : all;
  });

  async onMount() {
    if (!AuthStore.branches.value) await AuthStore.loadProfile();
    await BranchDirectoryStore.ensureLoaded();
    this.branchId.value = this.availableBranches.value[0]?.id ?? '';
    this.loading.value = false;
    if (this.branchId.value) this.loadBranchData();
    if (this.isAdmin.value) this.loadComparison();
  }

  setBranchId = (value) => {
    this.branchId.value = value;
    this.loadBranchData();
  };

  async loadBranchData() {
    const branchId = this.branchId.value;
    if (!branchId) return;
    try {
      const [salesTrend, rotation, transfersImpact, lowStock] = await Promise.all([
        DashboardService.salesTrend(branchId),
        DashboardService.inventoryRotation(branchId),
        DashboardService.activeTransfersImpact(branchId),
        DashboardService.lowStock(branchId),
      ]);
      this.salesTrend.value = salesTrend;
      this.rotation.value = rotation;
      this.transfersImpact.value = transfersImpact;
      this.lowStock.value = lowStock;
    } catch {
      UiStore.fail('No se pudo cargar el panel de esta sucursal.');
    }
  }

  async loadComparison() {
    try {
      this.comparison.value = await DashboardService.branchComparison();
    } catch {
      UiStore.fail('No se pudo cargar la comparativa entre sucursales.');
    }
  }
}
