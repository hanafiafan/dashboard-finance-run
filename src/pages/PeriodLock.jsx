import { useEffect, useState } from 'react';
import { Lock, Unlock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getPeriodLocks, lockPeriod, unlockPeriod } from '../api/financeApi';
import { formatDateTime } from '../utils/formatters';
import { notify } from '../components/ui/Toast';

const monthLabel = (periodMonth) =>
  new Date(`${periodMonth}T00:00:00`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

// Month-end close: locking a period blocks writes to fin_budget/fin_income/
// fin_outcome dated inside it at the RLS layer (0026), even for superadmin —
// this panel is just the UI for that table (fin_period_locks), which any
// superadmin can also read/write directly if this page is ever unavailable.
export default function PeriodLock() {
  const { session } = useAuth();
  const [rows, setRows] = useState([]);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try { const { rows } = await getPeriodLocks(session); setRows(rows); }
    catch (err) { notify.error(err.message || 'Gagal memuat daftar periode.'); }
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const handleLock = async (e) => {
    e.preventDefault();
    if (!month) return;
    const periodMonth = `${month}-01`;
    if (!window.confirm(`Kunci periode ${monthLabel(periodMonth)}? Setelah dikunci, data budget/income/outcome di bulan ini tidak bisa diubah siapa pun (termasuk superadmin) sampai dibuka kembali.`)) return;
    setBusy(true);
    try {
      await lockPeriod(periodMonth, session);
      notify.success(`Periode ${monthLabel(periodMonth)} dikunci.`);
      await refresh();
    } catch (err) { notify.error(err.message || 'Gagal mengunci periode.'); }
    setBusy(false);
  };

  const handleUnlock = async (row) => {
    if (!window.confirm(`Buka kunci periode ${monthLabel(row.period_month)}?`)) return;
    setBusy(true);
    try {
      await unlockPeriod(row.id, row.period_month, session);
      notify.success(`Periode ${monthLabel(row.period_month)} dibuka kembali.`);
      await refresh();
    } catch (err) { notify.error(err.message || 'Gagal membuka periode.'); }
    setBusy(false);
  };

  return (
    <div className="panel tight">
      <div className="panel-head">
        <div><h3><Lock size={15} style={{ verticalAlign: -2, marginRight: 6 }} />Tutup Buku Bulanan</h3><p>Kunci periode yang sudah final agar data budget, income, dan outcome di bulan itu tidak bisa diubah lagi.</p></div>
      </div>
      <div className="modal-body">
        <form onSubmit={handleLock} className="modal-form">
          <div className="form-group">
            <label htmlFor="lock-month">Periode</label>
            <input id="lock-month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} required />
          </div>
          <div className="full-width row-actions" style={{ justifyContent: 'flex-end' }}>
            <button type="submit" className="btn primary" disabled={busy}><Lock size={14} /> Kunci Periode</button>
          </div>
        </form>
      </div>
      {loading ? <div className="table-loading">Memuat...</div> : rows.length ? (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead><tr><th>Periode</th><th>Dikunci Pada</th><th style={{ width: 120 }}>Aksi</th></tr></thead>
            <tbody>{rows.map((row) => (
              <tr key={row.id}>
                <td><span className="status bad">{monthLabel(row.period_month)}</span></td>
                <td>{formatDateTime(row.locked_at)}</td>
                <td><button className="btn ghost sm" onClick={() => handleUnlock(row)} disabled={busy}><Unlock size={13} /> Buka</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : <div className="table-empty"><strong>Belum ada periode yang dikunci.</strong></div>}
    </div>
  );
}
