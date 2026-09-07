import { Fragment, useEffect } from 'react';
import { useController } from '@/lib/useController';
import { usePageSize } from '@/lib/usePageSize';
import { formatDateTime } from '@/lib/format';
import { AsyncBoundary } from '@/components/AsyncBoundary';
import { Pager } from '@/components/Pager';
import { AuditController } from './AuditController';
import { AuditFilters } from './components/AuditFilters';
import { AuditDiff } from './components/AuditDiff';
import { auditActionBadgeClass, auditActionLabel } from './constants';
import './Audit.css';

export default function AuditPage() {
  const controller = useController(AuditController);
  const rows = controller.rows.value;
  const page = controller.pageInfo.value;
  const expandedId = controller.expandedId.value;
  const [cardRef, pageSize] = usePageSize();

  useEffect(() => {
    if (!controller.loading.value) controller.setPageSize(pageSize);
  }, [pageSize, controller]);

  return (
    <main className="audit-page">
      <p className="audit-intro">
        Registro de cada alta, modificación y baja del catálogo de productos: quién lo hizo, cuándo y
        qué cambió.
      </p>

      <AuditFilters controller={controller} />

      <AsyncBoundary loading={controller.loading.value}>
        <div className="audit-table-card is-paged" ref={cardRef}>
          {rows.length === 0 ? (
            <p className="audit-empty">No hay eventos de auditoría que coincidan con los filtros.</p>
          ) : (
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Producto</th>
                  <th>Acción</th>
                  <th>Responsable</th>
                  <th aria-label="Detalle" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isExpanded = expandedId === row.id;
                  return (
                    <Fragment key={row.id}>
                      <tr>
                        <td>{formatDateTime(row.eventDate)}</td>
                        <td>{row.entityLabel ?? `#${row.entityId}`}</td>
                        <td>
                          <span className={auditActionBadgeClass(row.action)}>
                            {auditActionLabel(row.action)}
                          </span>
                        </td>
                        <td>{controller.userName(row.userId)}</td>
                        <td>
                          <button
                            type="button"
                            onClick={() => controller.toggleExpanded(row.id)}
                            aria-expanded={isExpanded}
                          >
                            {isExpanded ? 'Ocultar cambios' : 'Ver cambios'}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="audit-detail-row">
                          <td colSpan={5}>
                            <AuditDiff oldValues={row.oldValues} newValues={row.newValues} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {rows.length > 0 && (
          <div className="audit-footer">
            <Pager
              page={page.number}
              pageSize={controller.pageSize.value}
              total={page.totalElements}
              onPrev={() => controller.goToPage(page.number - 1)}
              onNext={() => controller.goToPage(page.number + 1)}
            />
          </div>
        )}
      </AsyncBoundary>
    </main>
  );
}
