import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import httpClient from '../api/httpClient';
import { TRANSFER_STATUS_LABELS, urgencyBadgeClass, urgencyLabel } from '../constants/transfers';

// Orden de las secciones del panel: primero lo que todavía necesita acción
// (activas), después lo ya resuelto — coincide con el enunciado de la
// tarjeta ("en preparación, en tránsito, recibido, con faltantes").
const SECTION_ORDER = ['REQUESTED', 'IN_PREPARATION', 'IN_TRANSIT', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED', 'CANCELLED'];
const REFRESH_INTERVAL_MS = 20000;

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function TransfersPage() {
  // null = todavía no cargó ni una vez ("Cargando…" de pantalla completa).
  // Un array (incluso vacío) ya cargó al menos una vez — los refrescos
  // automáticos posteriores actualizan este mismo estado sin volver a
  // mostrar "Cargando…" ni recargar la página (criterio de aceptación).
  const [transfers, setTransfers] = useState(null);
  const [branchNames, setBranchNames] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const branchesLoadedRef = useRef(false);

  const load = () => {
    setRefreshing(true);
    const requests = [httpClient.get('/api/transfers')];
    if (!branchesLoadedRef.current) requests.push(httpClient.get('/api/branches'));

    return Promise.all(requests)
      .then(([transfersRes, branchesRes]) => {
        setTransfers(transfersRes.data);
        if (branchesRes) {
          const names = {};
          branchesRes.data.forEach((branch) => {
            names[branch.id] = branch.name;
          });
          setBranchNames(names);
          branchesLoadedRef.current = true;
        }
        setLastUpdated(new Date());
      })
      .finally(() => setRefreshing(false));
  };

  useEffect(() => {
    // setTimeout(0) en vez de llamar load() directo: load() hace un
    // setState síncrono al entrar (setRefreshing(true)), y React advierte
    // contra setState síncrono dentro del cuerpo de un efecto — con esto
    // queda diferido, no dentro de la ejecución síncrona del efecto.
    const timeoutId = setTimeout(load, 0);
    const intervalId = setInterval(load, REFRESH_INTERVAL_MS);
    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, []);

  if (transfers === null) return <main>Cargando…</main>;

  const sections = SECTION_ORDER.map((status) => ({
    status,
    label: TRANSFER_STATUS_LABELS[status],
    items: transfers.filter((transfer) => transfer.status === status),
  })).filter((section) => section.items.length > 0);

  return (
    <main>
      <div className="panel-header">
        <h1>Transferencias entre sucursales</h1>
        <div className="panel-refresh">
          {lastUpdated && <span>Actualizado {formatTime(lastUpdated)}</span>}
          <button type="button" onClick={load} disabled={refreshing}>
            {refreshing ? 'Actualizando…' : 'Actualizar ahora'}
          </button>
        </div>
      </div>
      <Link to="/transferencias/nueva">+ Solicitar transferencia</Link>

      {sections.length === 0 && <p>No hay transferencias registradas todavía.</p>}

      {sections.map((section) => (
        <div className="status-section" key={section.status}>
          <h2>
            {section.label} <span className="count">{section.items.length}</span>
          </h2>
          <table>
            <thead>
              <tr>
                <th>Número</th>
                <th>Origen</th>
                <th>Destino</th>
                <th>Urgencia</th>
                <th>Fecha de solicitud</th>
              </tr>
            </thead>
            <tbody>
              {section.items.map((transfer) => (
                <tr key={transfer.id}>
                  <td>
                    <Link to={`/transferencias/${transfer.id}`}>{transfer.transferNumber}</Link>
                  </td>
                  <td>{branchNames[transfer.originBranchId] ?? transfer.originBranchId}</td>
                  <td>{branchNames[transfer.destinationBranchId] ?? transfer.destinationBranchId}</td>
                  <td>
                    <span className={urgencyBadgeClass(transfer.urgency)}>{urgencyLabel(transfer.urgency)}</span>
                  </td>
                  <td>{new Date(transfer.requestDate).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </main>
  );
}
