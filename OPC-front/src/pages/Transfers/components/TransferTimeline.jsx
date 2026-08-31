import { TRANSFER_TIMELINE_STEPS } from '../constants';

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString() : null;
}

/**
 * Línea de tiempo de estados de una transferencia. `currentStep` es el
 * índice del paso en curso; `isTerminal` marca el último paso como
 * completado cuando la transferencia llegó a un estado final (recibida).
 */
export function TransferTimeline({ status, events, currentStep, isTerminal }) {
  return (
    <ol className="transfer-timeline">
      {TRANSFER_TIMELINE_STEPS.map((step, index) => {
        const state =
          index < currentStep || (index === currentStep && isTerminal)
            ? 'done'
            : index === currentStep
              ? 'current'
              : 'pending';
        const stepEvent = events.find((event) => step.matches.includes(event.status));
        return (
          <li key={step.key} className={`timeline-step timeline-${state}`}>
            <span className="timeline-dot" />
            <div className="timeline-body">
              <strong>{step.label(status)}</strong>
              {stepEvent && <time>{formatDateTime(stepEvent.eventDate)}</time>}
              {stepEvent?.notes && <p className="timeline-notes">{stepEvent.notes}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
