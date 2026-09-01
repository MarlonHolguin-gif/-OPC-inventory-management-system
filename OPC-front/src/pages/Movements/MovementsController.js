import { signal, computed } from '@preact/signals-react';
import { Controller } from '@/lib/Controller';
import { AuthStore } from '@/stores/AuthStore';
import { BranchDirectoryStore } from '@/stores/BranchDirectoryStore';
import { UiStore } from '@/stores/UiStore';
import { GENERAL_ADMIN } from '@/constants/roles';
import { MovementService } from './services/MovementService';
import { MovementFormController } from './controllers/MovementFormController';

const EMPTY_FILTERS = { branchId: '', productId: '', movementType: '', from: '', to: '' };

/**
 * Módulo Movimientos: historial de movimientos consultable (con filtros en
 * fila) + registro de un movimiento manual en modal. El historial ya viene
 * acotado por sucursal desde el backend (el administrador ve todas; el
 * gerente y el operador solo las suyas).
 */
export class MovementsController extends Controller {
  products = signal([]);
  history = signal([]);
  filters = signal({ ...EMPTY_FILTERS });
  loading = signal(true);
  searching = signal(false);

  form = new MovementFormController(this);

  isAdmin = computed(() => AuthStore.role.value === GENERAL_ADMIN);

  availableBranches = computed(() => {
    const own = AuthStore.branches.value;
    const all = BranchDirectoryStore.all.value;
    return Array.isArray(own) ? all.filter((branch) => own.includes(branch.id)) : all;
  });

  async onMount() {
    if (!AuthStore.branches.value) await AuthStore.loadProfile();
    try {
      const [products, history] = await Promise.all([
        MovementService.productCatalog(),
        MovementService.history({}),
        BranchDirectoryStore.ensureLoaded(),
      ]);
      this.products.value = products;
      this.history.value = history;
    } catch {
      UiStore.fail('No se pudo cargar el historial de movimientos.');
    } finally {
      this.loading.value = false;
    }
  }

  branchName(id) {
    return BranchDirectoryStore.nameOf(id) ?? id;
  }

  setFilter = (key, value) => {
    this.filters.value = { ...this.filters.value, [key]: value };
  };

  clearFilters = () => {
    this.filters.value = { ...EMPTY_FILTERS };
  };

  async search(event) {
    event?.preventDefault();
    UiStore.clear();
    this.searching.value = true;
    try {
      const f = this.filters.value;
      const params = {};
      if (f.branchId) params.branchId = f.branchId;
      if (f.productId) params.productId = f.productId;
      if (f.movementType) params.movementType = f.movementType;
      if (f.from) params.from = `${f.from}T00:00:00`;
      if (f.to) params.to = `${f.to}T23:59:59`;
      this.history.value = await MovementService.history(params);
    } catch {
      UiStore.fail('No se pudo consultar el historial de movimientos.');
    } finally {
      this.searching.value = false;
    }
  }

  // Re-ejecuta la consulta con los filtros actuales (tras registrar un movimiento).
  refresh() {
    return this.search();
  }
}
