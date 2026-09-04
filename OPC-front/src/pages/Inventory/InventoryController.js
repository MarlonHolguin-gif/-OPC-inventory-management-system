import { signal, computed } from '@preact/signals-react';
import { Controller } from '@/lib/Controller';
import { AuthStore } from '@/stores/AuthStore';
import { BranchDirectoryStore } from '@/stores/BranchDirectoryStore';
import { UiStore } from '@/stores/UiStore';
import { InventoryService } from './services/InventoryService';
import { InventoryThresholdController } from './controllers/InventoryThresholdController';

/**
 * Vista de inventario por sucursal: catálogo completo con stock actual,
 * umbrales y estado de alerta de la sucursal elegida. La configuración de
 * umbrales (mínimo/máximo) va en un sub-controller de formulario.
 */
export class InventoryController extends Controller {
  products = signal([]);
  inventory = signal([]);
  selectedBranchId = signal(null);
  search = signal('');
  loading = signal(true);

  threshold = new InventoryThresholdController(this);

  // Sucursal pedida por enlace (clic en una notificación de stock). Se
  // aplica en onMount si es una sucursal real; si no, cae al comportamiento
  // normal (primera sucursal asignada).
  #linkedBranchId = null;

  constructor(link) {
    super();
    if (link?.search) this.search.value = link.search;
    this.#linkedBranchId = link?.branchId != null ? Number(link.branchId) : null;
  }

  allBranches = computed(() => BranchDirectoryStore.all.value);

  // ¿El usuario puede editar los umbrales de la sucursal seleccionada?
  // (admin = todas; el resto solo las asignadas). El backend igual lo valida.
  canEditSelectedBranch = computed(() => {
    const own = AuthStore.branches.value;
    if (!Array.isArray(own)) return true;
    return own.includes(Number(this.selectedBranchId.value));
  });

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
    const fallback =
      Array.isArray(own) && own.length > 0 ? own[0] : (this.allBranches.value[0]?.id ?? null);
    const linked = this.#linkedBranchId
      && this.allBranches.value.some((branch) => branch.id === this.#linkedBranchId)
      ? this.#linkedBranchId
      : null;
    this.selectedBranchId.value = linked ?? fallback;
    this.loading.value = false;

    if (this.selectedBranchId.value) await this.loadInventory();
  }

  // Llega desde la campana cuando la URL cambia sin re-montar la vista
  // (clic en otra notificación estando ya en Inventario). El montaje inicial
  // ya lo resuelve onMount, así que aquí se ignora mientras carga.
  openFromLink = (branchId, search) => {
    if (this.loading.value) return;
    if (search != null) this.search.value = search;
    const id = branchId != null ? Number(branchId) : null;
    if (id && id !== this.selectedBranchId.value
      && this.allBranches.value.some((branch) => branch.id === id)) {
      this.setBranch(id);
    }
  };

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
