import { AsyncBoundary } from '@/components/AsyncBoundary';
import { BranchDirectoryStore } from '@/stores/BranchDirectoryStore';

export function UserBranchesPanel({ controller }) {
  const assignedIds = controller.assignedIds.value;

  return (
    <AsyncBoundary loading={controller.loading.value}>
      <div className="branch-grid">
        {BranchDirectoryStore.all.value.map((branch) => {
          const isAssigned = assignedIds.includes(branch.id);
          return (
            <label key={branch.id} className={`branch-toggle${isAssigned ? ' checked' : ''}`}>
              <input
                type="checkbox"
                checked={isAssigned}
                onChange={() => controller.toggle(branch.id, isAssigned)}
              />
              {branch.name}
            </label>
          );
        })}
      </div>
    </AsyncBoundary>
  );
}
