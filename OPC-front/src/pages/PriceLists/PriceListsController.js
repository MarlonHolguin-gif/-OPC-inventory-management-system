import { signal, computed } from '@preact/signals-react';
import { CrudListController } from '@/lib/CrudListController';
import { ListFilter } from '@/lib/ListFilter';
import { UiStore } from '@/stores/UiStore';
import { isCurrentlyValid } from '@/lib/format';
import { PriceListService } from './services/PriceListService';
import { PriceListFormController } from './controllers/PriceListFormController';
import { PriceListItemsController } from './controllers/PriceListItemsController';

export class PriceListsController extends CrudListController {
  service = PriceListService;
  errors = {
    load: 'No se pudo cargar la lista de precios.',
    deactivate: 'No se pudo desactivar la lista de precios.',
    reactivate: 'No se pudo reactivar la lista de precios.',
  };

  products = signal([]);
  // Filtros en cliente con botón "Filtrar".
  filter = new ListFilter({ name: '', validity: '', status: '' });

  form = new PriceListFormController(this);
  itemsPanel = new PriceListItemsController(this);

  filtered = computed(() => {
    const { name, validity, status } = this.filter.applied.value;
    const query = name.trim().toLowerCase();
    return this.items.value
      .filter((list) => !query || (list.name ?? '').toLowerCase().includes(query))
      .filter((list) => !validity || (validity === 'valid') === isCurrentlyValid(list))
      .filter((list) => !status || (status === 'active') === Boolean(list.active));
  });

  async onMount() {
    await Promise.all([this.load(), this.loadProducts()]);
    this.loading.value = false;
  }

  async loadProducts() {
    try {
      this.products.value = await PriceListService.productCatalog();
    } catch {
      UiStore.fail('No se pudo cargar el catálogo de productos.');
    }
  }
}
