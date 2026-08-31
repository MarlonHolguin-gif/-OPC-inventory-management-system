import { signal, computed } from '@preact/signals-react';
import { Controller } from '@/lib/Controller';
import { AuthStore } from '@/stores/AuthStore';
import { BranchDirectoryStore } from '@/stores/BranchDirectoryStore';
import { UiStore } from '@/stores/UiStore';
import { InventoryService } from './services/InventoryService';

/**
 * Vista de inventario por sucursal: catálogo completo con stock actual y
 * estado de alerta de la sucursal elegida. Solo lectura.
 */
export class InventoryController extends Controller {
  products = signal([]);
  inventory = signal([]);
  selectedBranchId = signal(null);
  search = signal('');
  loading = signal(true);

  allBranches = computed(() => BranchDirectoryStore.all.value);

  inventoryByProductId = computed(() =>
    Object.fromEntries(this.inventory.value.map((item) => [item.productId, item])),
  );

  filtered = computed(() => {
    const term = this.search.value.trim().toLowerCase();
    if (!term) return this.products.value;
    return this.products.value.filter(
      (product) =>
        product.name.toLowerCase().includes(term) || product.sku.toLowerCase().includes(term),
    );
  });

  async onMount() {
    if (!AuthStore.branches.value) await AuthStore.loadProfile();
    await BranchDirectoryStore.ensureLoaded();
    try {
      this.products.value = await InventoryService.productCatalog();
    } catch {
      UiStore.fail('No se pudo cargar el catálogo o las sucursales.');
    }

    const own = AuthStore.branches.value;
    this.selectedBranchId.value =
      Array.isArray(own) && own.length > 0 ? own[0] : (this.allBranches.value[0]?.id ?? null);
    this.loading.value = false;

    if (this.selectedBranchId.value) await this.loadInventory();
  }

  setSearch = (value) => {
    this.search.value = value;
  };

  setBranch = (value) => {
    this.selectedBranchId.value = Number(value);
    this.loadInventory();
  };

  async loadInventory() {
    if (!this.selectedBranchId.value) return;
    try {
      this.inventory.value = await InventoryService.branchStock(this.selectedBranchId.value);
    } catch {
      UiStore.fail('No se pudo cargar el inventario de esa sucursal.');
    }
  }
}
