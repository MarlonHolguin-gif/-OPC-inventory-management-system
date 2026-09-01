import { useState } from 'react';
import { Tabs } from '@/components/Tabs';
import { PURCHASES_TABS } from './constants';
import { PurchaseOrdersPanel } from './components/PurchaseOrdersPanel';
import { PurchaseHistoryPanel } from './components/PurchaseHistoryPanel';
import './Purchases.css';

export default function PurchasesPage() {
  const [activeTab, setActiveTab] = useState('orders');

  return (
    <main>
      <h1>Compras</h1>

      <Tabs items={PURCHASES_TABS} active={activeTab} onSelect={setActiveTab} />

      {activeTab === 'orders' && <PurchaseOrdersPanel />}
      {activeTab === 'history' && <PurchaseHistoryPanel />}
    </main>
  );
}
