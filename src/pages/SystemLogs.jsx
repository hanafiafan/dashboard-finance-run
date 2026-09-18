import { useEffect, useState } from 'react';
import { ClipboardList, AlertTriangle } from 'lucide-react';
import { supabase } from '../api/supabaseClient';
import { formatDateTime } from '../utils/formatters';

const ACTION_LABEL = { create: 'Tambah', update: 'Ubah', delete: 'Hapus', approve: 'Approve', reject: 'Reject' };
const ACTION_STATUS = { create: 'ok', update: 'info', delete: 'bad', approve: 'ok', reject: 'bad' };

export default function SystemLogs() {
  const [tab, setTab] = useState('audit');
  const [audit, setAudit] = useState([]);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let disposed = false;
    setLoading(true);
    Promise.all([
      supabase.from('fin_audit_log').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('fin_error_log').select('*').order('created_at', { ascending: false }).limit(200),
    ]).then(([auditRes, errorRes]) => {
      if (disposed) return;
      if (auditRes.error || errorRes.error) {
        setError((auditRes.error || errorRes.error).message || 'Gagal memuat log.');
      } else {
        setAudit(auditRes.data || []);
        setErrors(errorRes.data || []);
      }
      setLoading(false);
    });
    return () => { disposed = true; };
  }, []);

  return (
    <div className="panel tight">
      <div className="panel-head">
        <div><h3>Log Sistem</h3><p>Jejak audit perubahan data dan log error aplikasi — hanya terlihat oleh Super Admin &amp; Finance.</p></div>
        <div className="segmented">
          <button className={tab === 'audit' ? 'active' : ''} onClick={() => setTab('audit')}><ClipboardList size={13} /> Log Aktivitas</button>
          <button className={tab === 'error' ? 'active' : ''} onClick={() => setTab('error')}><AlertTriangle size={13} /> Log Error</button>
        </div>
      </div>
      {loading ? <div className="table-loading">Memuat log...</div> : error ? <div className="table-empty" role="alert"><strong>{error}</strong></div> : tab === 'audit' ? (
        audit.length ? (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead><tr><th>Waktu</th><th>Aktor</th><th>Aksi</th><th>Entitas</th><th>ID</th><th>Detail</th></tr></thead>
              <tbody>{audit.map(row => (
                <tr key={row.id}>
                  <td>{formatDateTime(row.created_at)}</td>
                  <td>{row.actor_email || '—'}<br/><small style={{ color: 'var(--text-tertiary)' }}>{row.actor_role || '—'}</small></td>
                  <td><span className={`status ${ACTION_STATUS[row.action] || 'info'}`}>{ACTION_LABEL[row.action] || row.action}</span></td>
                  <td>{row.entity}</td>
                  <td>{row.entity_id || '—'}</td>
                  <td>{(row.before || row.after) && <details><summary>Lihat</summary><pre style={{ fontSize: 10, maxWidth: 360, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{JSON.stringify({ before: row.before, after: row.after }, null, 2)}</pre></details>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <div className="table-empty"><strong>Belum ada aktivitas tercatat.</strong></div>
      ) : (
        errors.length ? (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead><tr><th>Waktu</th><th>Sumber</th><th>Pesan</th><th>Halaman</th><th>Detail</th></tr></thead>
              <tbody>{errors.map(row => (
                <tr key={row.id}>
                  <td>{formatDateTime(row.created_at)}</td>
                  <td>{row.source || '—'}</td>
                  <td className="cell-text" style={{ maxWidth: 320 }} title={row.message}>{row.message}</td>
                  <td className="cell-text" style={{ maxWidth: 220 }} title={row.url}>{row.url}</td>
                  <td>{row.stack && <details><summary>Lihat</summary><pre style={{ fontSize: 10, maxWidth: 360, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{row.stack}</pre></details>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <div className="table-empty"><strong>Belum ada error tercatat.</strong></div>
      )}
    </div>
  );
}
