import { useController } from '@/lib/useController';
import { AsyncBoundary } from '@/components/AsyncBoundary';
import { SelectField } from '@/components/Field';
import { TopbarPortal } from '@/layout/TopbarSlot';
import { DashboardController } from './DashboardController';
import { SalesTrendCard } from './components/SalesTrendCard';
import { RotationCard } from './components/RotationCard';
import { TransfersImpactCard } from './components/TransfersImpactCard';
import { LowStockCard } from './components/LowStockCard';
import { BranchComparisonCard } from './components/BranchComparisonCard';
import './Dashboard.css';

export default function DashboardPage() {
  const controller = useController(DashboardController);

  const branchOptions = controller.availableBranches.value.map((b) => ({ value: b.id, label: b.name }));

  return (
    <main className="dashboard-page">
      <AsyncBoundary variant="screen" loading={controller.loading.value}>
        <TopbarPortal>
          <div className="dashboard-branch-picker">
            <SelectField
              label="Sucursal"
              value={controller.branchId.value}
              onChange={controller.setBranchId}
              options={branchOptions}
              placeholder={null}
            />
          </div>
        </TopbarPortal>

        <div className="dashboard-kpi-grid">
          <SalesTrendCard salesTrend={controller.salesTrend.value} />
          <RotationCard controller={controller} />
          <TransfersImpactCard transfersImpact={controller.transfersImpact.value} />
          <LowStockCard lowStock={controller.lowStock.value} />
        </div>

        {controller.isAdmin.value && (
          <BranchComparisonCard comparison={controller.comparison.value} />
        )}
      </AsyncBoundary>
    </main>
  );
}
