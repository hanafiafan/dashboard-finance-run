import { useState } from 'react';
import { Check, RotateCcw, X } from 'lucide-react';
import { DataTable } from '../components/ui/DataTable';
import { Panel } from '../components/ui/MetricCard';
import { Doughnut } from 'react-chartjs-2';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { approveBudget } from '../api/financeApi';
import { number } from '../utils/formatters';
import { notify } from '../components/ui/Toast';
import { CHART_COLORS, BUDGET_APPROVAL_THRESHOLD } from '../utils/constants';
import { forecastCashPosition, projectedCashRecommendation } from '../utils/ews';

export function Approval() {
  const { app } = useApp();
  const { session } = useAuth();
  const [loading, setLoading] = useState({});

  const summary = app.state?.dashboard?.summary || {};
  const forecast = app.state?.dashboard?.forecast || { in: [], out: [] };
  const rawRows = app.state?.dashboard?.tables?.pendingBudget || [];
  // Indicator #8 — Projected Cash Position: forecast the cash position up to each
  // request's tgl dibutuhkan, then check if it can still absorb the budget amount.
  const rows = rawRows.map(row => {
    const targetDate = row['Tgl Dibutuhkan'];
    const submitted = row['Tgl Pengajuan'];
    const daysWaiting = submitted ? Math.floor((Date.now() - new Date(submitted).getTime()) / 86400000) : null;
    const withAging = { ...row, 'Menunggu': daysWaiting == null ? '—' : `${daysWaiting} hari${daysWaiting >= 5 ? ' ⚠' : ''}` };
    if (!targetDate) return withAging;
    const fcp = forecastCashPosition(summary.bankBalance || 0, forecast.in, forecast.out, targetDate);
    const rec = projectedCashRecommendation(fcp, Number(row['Nominal Pengajuan (Rp)'] || 0));
    return { ...withAging, 'Rekomendasi Kas': rec.label };
  });
  const charts = app.state?.dashboard?.charts;

  const canApprove = session?.permissions?.canApprove;
  const cols = ['Brand', 'Tgl Pengajuan', 'Menunggu', 'Tgl Dibutuhkan', 'Kategori', 'Keterangan', 'Nominal Pengajuan (Rp)', 'Prioritas', 'Status', 'Rekomendasi Kas'];

  const handleApprove = async (row, status) => {
    const id = row.ID;
    // Amounts above the threshold need a Super Admin's final sign-off —
    // Finance's "Approve" only advances it to Pending Final Approval. The
    // real gate is the fin_budget RLS policy (migration 0024); this just
    // keeps the UI honest about what's actually going to happen.
    const amount = Number(row['Nominal Pengajuan (Rp)'] || 0);
    const isLargeAmount = amount > BUDGET_APPROVAL_THRESHOLD;
    const finalStatus = status === 'Approved' && session?.role === 'finance' && isLargeAmount
      ? 'Pending Final Approval'
      : status;
    const paid = finalStatus === 'Approved' ? prompt('Nominal dibayar, kosongkan jika belum:') || '' : '';
    const feedback = prompt('Feedback finance:') || '';
    setLoading((prev) => ({ ...prev, [id]: true }));
    try {
      await approveBudget(id, finalStatus, paid, feedback, session);
      notify.success(finalStatus === 'Pending Final Approval'
        ? 'Diteruskan ke Super Admin.\nNominal di atas ambang batas butuh persetujuan final Super Admin sebelum berstatus Approved.'
        : `Pengajuan di-${finalStatus}.\nHalaman akan dimuat ulang agar saldo dan status ikut ter-update.`);
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      console.error(err);
      notify.error(err.message || 'Gagal memproses approval.');
    }
    setLoading((prev) => ({ ...prev, [id]: false }));
  };

  const priorityData = {
    labels: (charts?.priority || []).map((x) => x.label),
    datasets: [{ data: (charts?.priority || []).map((x) => x.value), backgroundColor: CHART_COLORS, borderWidth: 0 }],
  };

  return (
    <div className="grid-2 approval-grid">
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
                      onClick={() => handleApprove(row, 'Approved')}
                      disabled={loading[row.ID]}
                      title={session?.role === 'finance' && Number(row['Nominal Pengajuan (Rp)'] || 0) > BUDGET_APPROVAL_THRESHOLD ? 'Teruskan ke Super Admin' : 'Approve'}
                    >
                      <Check size={15} />
                    </button>
                    <button
                      className="icon-btn"
                      onClick={() => handleApprove(row, 'Need Revision')}
                      disabled={loading[row.ID]}
                      title="Revisi"
                    >
                      <RotateCcw size={15} />
                    </button>
                    <button
                      className="icon-btn"
                      onClick={() => handleApprove(row, 'Rejected')}
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
      <Panel title="Prioritas request" note="High, medium, low" glow>
        <div className="chart-box">
          <Doughnut data={priorityData} options={{ cutout: '62%', responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: undefined }} />
        </div>
      </Panel>
    </div>
  );
}
