import { useState, useRef } from 'react';
import { Check, RotateCcw, X } from 'lucide-react';
import { DataTable } from '../components/ui/DataTable';
import { Panel } from '../components/ui/MetricCard';
import { Doughnut } from 'react-chartjs-2';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { approveBudget, getAppState } from '../api/financeApi';
import { number, money } from '../utils/formatters';
import { notify } from '../components/ui/Toast';
import { CHART_COLORS, BUDGET_APPROVAL_THRESHOLD } from '../utils/constants';
import { Modal } from '../components/ui/Modal';
import { getChartTheme } from '../utils/chartTheme';
import { forecastCashPosition, projectedCashRecommendation } from '../utils/ews';

export function Approval() {
  const { app, setState } = useApp();
  const currentFilters = useRef(app.filters);
  currentFilters.current = app.filters;
  const { session } = useAuth();
  const [loading, setLoading] = useState({});
  const [review, setReview] = useState(null);
  const [paid, setPaid] = useState('');
  const [feedback, setFeedback] = useState('');
  const saving = useRef(false);
  const startReview = (row, status) => { setPaid(''); setFeedback(''); setReview({ row, status }); };

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
    if (saving.current) return;
    if (finalStatus === 'Approved' && paid !== '' && (!Number.isFinite(Number(paid)) || Number(paid) < 0 || Number(paid) > amount)) { notify.error('Nominal dibayar harus antara 0 dan nominal pengajuan.'); return; }
    if (['Rejected', 'Need Revision'].includes(finalStatus) && !feedback.trim()) { notify.error('Isi alasan keputusan terlebih dahulu.'); return; }
    saving.current = true;
    setLoading((prev) => ({ ...prev, [id]: true }));
    try {
      await approveBudget(id, finalStatus, finalStatus === 'Approved' ? paid : '', feedback.trim(), session);
      setReview(null);
      notify.success(session?.isDemo ? 'Simulasi selesai. Data demo tidak diubah.' : finalStatus === 'Pending Final Approval' ? 'Pengajuan diteruskan ke Super Admin.' : 'Keputusan tersimpan.');
      try {
        const filters = currentFilters.current;
        const nextState = await getAppState(filters, session);
        if (filters === currentFilters.current) setState(nextState);
      } catch {
        notify.error('Keputusan tersimpan, tetapi tampilan belum diperbarui. Klik Refresh.');
      }
    } catch (err) {
      console.error(err);
      notify.error(err.message || 'Gagal memproses approval.');
    }
    saving.current = false;
    setLoading((prev) => ({ ...prev, [id]: false }));
  };

  const priorityData = {
    labels: (charts?.priority || []).map((x) => x.label),
    datasets: [{ data: (charts?.priority || []).map((x) => x.value), backgroundColor: CHART_COLORS, borderWidth: 0 }],
  };

  return (
    <>
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
                      onClick={() => startReview(row, 'Approved')}
                      disabled={loading[row.ID]}
                      title={session?.role === 'finance' && Number(row['Nominal Pengajuan (Rp)'] || 0) > BUDGET_APPROVAL_THRESHOLD ? 'Teruskan ke Super Admin' : 'Approve'}
                    >
                      <Check size={15} />
                    </button>
                    <button
                      className="icon-btn"
                      onClick={() => startReview(row, 'Need Revision')}
                      disabled={loading[row.ID]}
                      title="Revisi"
                    >
                      <RotateCcw size={15} />
                    </button>
                    <button
                      className="icon-btn"
                      onClick={() => startReview(row, 'Rejected')}
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
          <Doughnut data={priorityData} options={{ cutout: '62%', responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: getChartTheme().labelColor } } }, scales: undefined }} />
      </Panel>
    </div>
    <Modal isOpen={!!review} onClose={() => { if (!saving.current) setReview(null); }} title={review?.status === 'Approved' ? 'Tinjau persetujuan' : review?.status === 'Rejected' ? 'Tolak pengajuan' : 'Minta revisi'}>
      {review && <form onSubmit={e => { e.preventDefault(); handleApprove(review.row, review.status); }}>
        <div className="review-summary"><div><span>Brand</span><strong>{review.row.Brand}</strong></div><div><span>Nominal pengajuan</span><strong>{money.format(Number(review.row['Nominal Pengajuan (Rp)'] || 0))}</strong></div><div style={{ gridColumn: '1 / -1' }}><span>Keterangan</span><strong>{review.row.Keterangan || '—'}</strong></div></div>
        {review.status === 'Approved' && session?.role === 'finance' && Number(review.row['Nominal Pengajuan (Rp)']) > BUDGET_APPROVAL_THRESHOLD ? <p className="recon-context">Pengajuan ini diteruskan ke Super Admin untuk persetujuan final.</p> : review.status === 'Approved' && <div className="form-group"><label htmlFor="approval-paid">Nominal yang sudah dibayar (opsional)</label><input id="approval-paid" type="number" min="0" max={Number(review.row['Nominal Pengajuan (Rp)'])} step="1" value={paid} onChange={e => setPaid(e.target.value)} disabled={loading[review.row.ID]}/><p className="form-intro">Isi hanya pembayaran yang sudah terjadi. Persetujuan ini tidak menjalankan transfer bank.</p></div>}
        <div className="form-group"><label htmlFor="approval-feedback">{review.status === 'Approved' ? 'Catatan keputusan' : 'Alasan keputusan (wajib)'}</label><textarea id="approval-feedback" value={feedback} onChange={e => setFeedback(e.target.value)} required={review.status !== 'Approved'} disabled={loading[review.row.ID]}/></div>
        <div className="modal-actions"><button type="button" className="btn ghost" disabled={loading[review.row.ID]} onClick={() => setReview(null)}>Batal</button><button className="btn primary" type="submit" disabled={loading[review.row.ID]}>{loading[review.row.ID] ? 'Menyimpan…' : session?.isDemo ? 'Simulasikan keputusan' : 'Simpan keputusan'}</button></div>
      </form>}
    </Modal>
    </>
  );
}
