import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import httpClient from '../api/httpClient';
import { statusBadgeClass, transferStatusLabel, urgencyBadgeClass, urgencyLabel } from '../constants/transfers';

export default function TransfersPage() {
  const [transfers, setTransfers] = useState([]);
  const [branchNames, setBranchNames] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([httpClient.get('/api/transfers'), httpClient.get('/api/branches')])
      .then(([transfersRes, branchesRes]) => {
        setTransfers(transfersRes.data);
        const names = {};
        branchesRes.data.forEach((branch) => {
          names[branch.id] = branch.name;
        });
        setBranchNames(names);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <main>Cargando…</main>;

  return (
    <main>
      <h1>Transferencias entre sucursales</h1>
      <Link to="/transferencias/nueva">+ Solicitar transferencia</Link>

      <table>
        <thead>
          <tr>
            <th>Número</th>
            <th>Origen</th>
            <th>Destino</th>
            <th>Urgencia</th>
            <th>Estado</th>
            <th>Fecha de solicitud</th>
          </tr>
        </thead>
        <tbody>
          {transfers.map((transfer) => (
            <tr key={transfer.id}>
              <td>
                <Link to={`/transferencias/${transfer.id}`}>{transfer.transferNumber}</Link>
              </td>
              <td>{branchNames[transfer.originBranchId] ?? transfer.originBranchId}</td>
              <td>{branchNames[transfer.destinationBranchId] ?? transfer.destinationBranchId}</td>
              <td>
                <span className={urgencyBadgeClass(transfer.urgency)}>{urgencyLabel(transfer.urgency)}</span>
              </td>
              <td>
                <span className={statusBadgeClass(transfer.status)}>{transferStatusLabel(transfer.status)}</span>
              </td>
              <td>{new Date(transfer.requestDate).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
