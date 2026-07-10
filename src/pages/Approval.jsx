import { useState } from 'react';
import { Check, RotateCcw, X } from 'lucide-react';
import { DataTable } from '../components/ui/DataTable';
import { Panel } from '../components/ui/MetricCard';
import { Doughnut } from 'react-chartjs-2';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { approveBudget } from '../api/financeApi';
import { number } from '../utils/formatters';
import { CHART_COLORS } from '../utils/constants';

export function Approval() {
  const { app } = useApp();
  const { session } = useAuth();
  const [loading, setLoading] = useState({});

  const rows = app.state?.dashboard?.tables?.pendingBudget || [];
  const charts = app.state?.dashboard?.charts;

  const canApprove = app.state?.session?.permissions?.canApprove;
  const cols = ['Brand', 'Tgl Pengajuan', 'Tgl Dibutuhkan', 'Kategori', 'Keterangan', 'Nominal Pengajuan (Rp)', 'Prioritas', 'Status'];

  const handleApprove = async (id, status) => {
    const paid = status === 'Approved' ? prompt('Nominal dibayar, kosongkan jika belum:') || '' : '';
    const feedback = prompt('Feedback finance:') || '';
    setLoading((prev) => ({ ...prev, [id]: true }));
    try {
      await approveBudget(id, status, paid, feedback, session);
      alert(`Status: ${status}`);
      window.location.reload();
    } catch (err) {
      alert(err.message);
    }
    setLoading((prev) => ({ ...prev, [id]: false }));
  };

  const priorityData = {
    labels: (charts?.priority || []).map((x) => x.label),
    datasets: [{ data: (charts?.priority || []).map((x) => x.value), backgroundColor: CHART_COLORS, borderWidth: 0 }],
  };

  return (
    <div className="grid-2">
      <div className="panel tight">
        <div className="panel-head">
          <div>
            <h3>Antrian approval</h3>
            <p>{number.format(rows.length)} budget request</p>
          </div>
        </div>
        <DataTable
          columns={cols}
          rows={rows}
          renderActions={
            canApprove
              ? (row) => (
                  <>
                    <button
                      className="icon-btn"
                      onClick={() => handleApprove(row.ID, 'Approved')}
                      disabled={loading[row.ID]}
                      title="Approve"
                    >
                      <Check size={15} />
                    </button>
                    <button
                      className="icon-btn"
                      onClick={() => handleApprove(row.ID, 'Need Revision')}
                      disabled={loading[row.ID]}
                      title="Revisi"
                    >
                      <RotateCcw size={15} />
                    </button>
                    <button
                      className="icon-btn"
                      onClick={() => handleApprove(row.ID, 'Rejected')}
                      disabled={loading[row.ID]}
                      title="Tolak"
                    >
                      <X size={15} />
                    </button>
                  </>
                )
              : null
          }
        />
      </div>
      <Panel title="Prioritas request" note="High, medium, low">
        <Doughnut data={priorityData} options={{ cutout: '62%', responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: undefined }} />
      </Panel>
    </div>
  );
}
