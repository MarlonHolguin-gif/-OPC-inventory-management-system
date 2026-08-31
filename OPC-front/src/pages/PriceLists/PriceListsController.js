import { signal } from '@preact/signals-react';
import { CrudListController } from '@/lib/CrudListController';
import { UiStore } from '@/stores/UiStore';
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
  form = new PriceListFormController(this);
  itemsPanel = new PriceListItemsController(this);

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
