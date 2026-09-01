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
 * sucursales (solo admin). La rotación tiene sus propios filtros (alta/baja
 * demanda y rango de fechas) que recargan solo ese card.
 */
export class DashboardController extends Controller {
  branchId = signal('');
  salesTrend = signal(null);
  rotation = signal(null);
  transfersImpact = signal(null);
  lowStock = signal(null);
  comparison = signal(null);
  loading = signal(true);

  // Filtros propios del card de rotación.
  rotationOrder = signal('DESC'); // 'DESC' = alta demanda, 'ASC' = baja demanda
  rotationFrom = signal('');
  rotationTo = signal('');

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
      const [salesTrend, transfersImpact, lowStock] = await Promise.all([
        DashboardService.salesTrend(branchId),
        DashboardService.activeTransfersImpact(branchId),
        DashboardService.lowStock(branchId),
      ]);
      this.salesTrend.value = salesTrend;
      this.transfersImpact.value = transfersImpact;
      this.lowStock.value = lowStock;
    } catch {
      UiStore.fail('No se pudo cargar el panel de esta sucursal.');
    }
    this.loadRotation();
  }

  async loadRotation() {
    const branchId = this.branchId.value;
    if (!branchId) return;
    try {
      this.rotation.value = await DashboardService.inventoryRotation(branchId, {
        order: this.rotationOrder.value,
        from: this.rotationFrom.value ? `${this.rotationFrom.value}T00:00:00` : undefined,
        to: this.rotationTo.value ? `${this.rotationTo.value}T23:59:59` : undefined,
      });
    } catch {
      UiStore.fail('No se pudo cargar la rotación de inventario.');
    }
  }

  setRotationOrder = (value) => {
    this.rotationOrder.value = value;
    this.loadRotation();
  };

  setRotationFrom = (value) => {
    this.rotationFrom.value = value;
    this.loadRotation();
  };

  setRotationTo = (value) => {
    this.rotationTo.value = value;
    this.loadRotation();
  };

  async loadComparison() {
    try {
      this.comparison.value = await DashboardService.branchComparison();
    } catch {
      UiStore.fail('No se pudo cargar la comparativa entre sucursales.');
    }
  }
}
