import { signal, computed } from '@preact/signals-react';
import { Controller } from '@/lib/Controller';
import { ListFilter } from '@/lib/ListFilter';
import { UiStore } from '@/stores/UiStore';
import { BranchDirectoryStore } from '@/stores/BranchDirectoryStore';
import { CategoryService } from './services/CategoryService';
import { UnitService } from './services/UnitService';
import { ProductService } from './services/ProductService';
import { CategoryFormController } from './controllers/CategoryFormController';
import { UnitFormController } from './controllers/UnitFormController';
import { ProductFormController } from './controllers/ProductFormController';
import { ProductUnitsController } from './controllers/ProductUnitsController';

export const CATALOG_TABS = [
  { id: 'categories', label: 'Categorías' },
  { id: 'units', label: 'Unidades de medida' },
  { id: 'products', label: 'Productos' },
];

/**
 * Controller del módulo Catálogo. Concentra los datos compartidos por las
 * tres pestañas (categorías, unidades, productos) y delega el estado de cada
 * formulario en un sub-controller. Las pestañas mutan estos signals; la
 * página los lee.
 */
function byNameStatus(list, applied) {
  const query = (applied.name ?? '').trim().toLowerCase();
  return list
    .filter((item) => !query || (item.name ?? '').toLowerCase().includes(query))
    .filter((item) => !applied.status || (applied.status === 'active') === Boolean(item.active));
}

export class CatalogController extends Controller {
  activeTab = signal('categories');
  categories = signal([]);
  units = signal([]);
  products = signal([]);
  loading = signal(true);

  categoryForm = new CategoryFormController(this);
  unitForm = new UnitFormController(this);
  productForm = new ProductFormController(this);
  productUnits = new ProductUnitsController(this);

  // Filtros en cliente con botón "Filtrar" (uno por pestaña).
  categoryFilter = new ListFilter({ name: '', status: '' });
  unitFilter = new ListFilter({ name: '', status: '' });
  productFilter = new ListFilter({ sku: '', name: '', categoryId: '', status: '' });

  filteredCategories = computed(() => byNameStatus(this.categories.value, this.categoryFilter.applied.value));
  filteredUnits = computed(() => byNameStatus(this.units.value, this.unitFilter.applied.value));

  filteredProducts = computed(() => {
    const f = this.productFilter.applied.value;
    const sku = f.sku.trim().toLowerCase();
    const name = f.name.trim().toLowerCase();
    return this.products.value
      .filter((product) => !sku || (product.sku ?? '').toLowerCase().includes(sku))
      .filter((product) => !name || (product.name ?? '').toLowerCase().includes(name))
      .filter((product) => !f.categoryId || String(product.categoryId) === String(f.categoryId))
      .filter((product) => !f.status || (f.status === 'active') === Boolean(product.active));
  });

  categoryOptions = computed(() =>
    this.categories.value.map((category) => ({ value: category.id, label: category.name })),
  );

  onMount() {
    return this.loadAll();
  }

  setTab = (tab) => {
    this.activeTab.value = tab;
  };

  async loadAll() {
    this.loading.value = true;
    try {
      const [categories, units, products] = await Promise.all([
        CategoryService.list(),
        UnitService.list(),
        ProductService.list(),
        BranchDirectoryStore.ensureLoaded(), // sucursales para el "stock inicial"
      ]);
      this.categories.value = categories;
      this.units.value = units;
      this.products.value = products;
    } catch {
      // el backend no discrimina cuál de las tres llamadas falló
      UiStore.fail('No se pudo cargar el catálogo.');
    } finally {
      this.loading.value = false;
    }
  }
}
