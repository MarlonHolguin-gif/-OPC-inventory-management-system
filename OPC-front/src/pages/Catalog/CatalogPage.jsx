import { useController } from '@/lib/useController';
import { Tabs } from '@/components/Tabs';
import { AsyncBoundary } from '@/components/AsyncBoundary';
import { CatalogController, CATALOG_TABS } from './CatalogController';
import { CategoriesTab } from './components/CategoriesTab';
import { UnitsTab } from './components/UnitsTab';
import { ProductsTab } from './components/ProductsTab';

export default function CatalogPage() {
  const controller = useController(CatalogController);
  const activeTab = controller.activeTab.value;

  return (
    <main>
      <h1>Catálogo</h1>

      <Tabs items={CATALOG_TABS} active={activeTab} onSelect={controller.setTab} />

      <AsyncBoundary variant="screen" loading={controller.loading.value}>
        {activeTab === 'categories' && <CategoriesTab controller={controller} />}
        {activeTab === 'units' && <UnitsTab controller={controller} />}
        {activeTab === 'products' && <ProductsTab controller={controller} />}
      </AsyncBoundary>
    </main>
  );
}
