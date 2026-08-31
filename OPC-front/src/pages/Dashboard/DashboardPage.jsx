import { useController } from '@/lib/useController';
import { AsyncBoundary } from '@/components/AsyncBoundary';
import { SelectField } from '@/components/Field';
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
    <main>
      <h1>Panel</h1>

      <AsyncBoundary loading={controller.loading.value}>
        <SelectField
          label="Sucursal"
          value={controller.branchId.value}
          onChange={controller.setBranchId}
          options={branchOptions}
          placeholder={null}
          style={{ maxWidth: 320, marginBottom: 22 }}
        />

        <section className="panel-card dashboard-kpis">
          <div className="dashboard-kpi-grid">
            <SalesTrendCard salesTrend={controller.salesTrend.value} />
            <RotationCard rotation={controller.rotation.value} />
            <TransfersImpactCard transfersImpact={controller.transfersImpact.value} />
            <LowStockCard lowStock={controller.lowStock.value} />
          </div>
        </section>

        {controller.isAdmin.value && (
          <BranchComparisonCard comparison={controller.comparison.value} />
        )}
      </AsyncBoundary>
    </main>
  );
}
