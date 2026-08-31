import { Fragment } from 'react';
import { useController } from '@/lib/useController';
import { AsyncBoundary } from '@/components/AsyncBoundary';
import { AuditController } from './AuditController';
import { AuditFilters } from './components/AuditFilters';
import { AuditDiff } from './components/AuditDiff';
import { auditActionBadgeClass, auditActionLabel, auditEntityLabel } from './constants';
import './Audit.css';

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString() : '—';
}

export default function AuditPage() {
  const controller = useController(AuditController);
  const rows = controller.rows.value;
  const page = controller.pageInfo.value;
  const expandedId = controller.expandedId.value;

  return (
    <main>
      <h1>Auditoría</h1>
      <p>Registro de altas, modificaciones y bajas de las entidades clave, y de los inicios de sesión.</p>

      <AuditFilters controller={controller} />

      <AsyncBoundary loading={controller.loading.value}>
        {rows.length === 0 ? (
          <p>No hay eventos de auditoría que coincidan con los filtros.</p>
        ) : (
          <>
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Entidad</th>
                  <th>ID</th>
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
                        <td>{auditEntityLabel(row.entity)}</td>
                        <td>{row.entityId}</td>
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
                          <td colSpan={6}>
                            <AuditDiff
                              action={row.action}
                              oldValues={row.oldValues}
                              newValues={row.newValues}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>

            <div className="audit-pager">
              <button
                type="button"
                onClick={() => controller.goToPage(page.number - 1)}
                disabled={page.first || controller.searching.value}
              >
                ← Anterior
              </button>
              <span>
                Página {page.number + 1} de {page.totalPages} · {page.totalElements} eventos
              </span>
              <button
                type="button"
                onClick={() => controller.goToPage(page.number + 1)}
                disabled={page.last || controller.searching.value}
              >
                Siguiente →
              </button>
            </div>
          </>
        )}
      </AsyncBoundary>
    </main>
  );
}
