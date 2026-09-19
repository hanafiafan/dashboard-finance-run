import { useEffect, useState } from 'react';
import { ClipboardList, AlertTriangle, Monitor, LogOut } from 'lucide-react';
import { supabase } from '../api/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { formatDateTime } from '../utils/formatters';
import { notify } from '../components/ui/Toast';

const ACTION_LABEL = { create: 'Tambah', update: 'Ubah', delete: 'Hapus', approve: 'Approve', reject: 'Reject' };
const ACTION_STATUS = { create: 'ok', update: 'info', delete: 'bad', approve: 'ok', reject: 'bad' };

export default function SystemLogs() {
  const { session } = useAuth();
  const isSuperadmin = session?.role === 'superadmin';
  const [tab, setTab] = useState('audit');
  const [audit, setAudit] = useState([]);
  const [errors, setErrors] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revoking, setRevoking] = useState('');

  useEffect(() => {
    let disposed = false;
    setLoading(true);
    setError('');
    const load = tab === 'sessions'
      ? supabase.rpc('admin_list_sessions').then(({ data, error }) => ({ data: { sessions: data }, error }))
      : Promise.all([
          supabase.from('fin_audit_log').select('*').order('created_at', { ascending: false }).limit(200),
          supabase.from('fin_error_log').select('*').order('created_at', { ascending: false }).limit(200),
        ]).then(([auditRes, errorRes]) => ({ data: { audit: auditRes.data, errors: errorRes.data }, error: auditRes.error || errorRes.error }));

    load.then(({ data, error }) => {
      if (disposed) return;
      if (error) {
        setError(tab === 'sessions' ? 'Gagal memuat sesi aktif (migrasi 0022 mungkin belum diterapkan).' : error.message || 'Gagal memuat log.');
      } else {
        if (data.audit) setAudit(data.audit || []);
        if (data.errors) setErrors(data.errors || []);
        if (data.sessions) setSessions(data.sessions || []);
      }
      setLoading(false);
    });
    return () => { disposed = true; };
  }, [tab]);

  const forceLogout = async (userId, email) => {
    if (!window.confirm(`Paksa logout ${email}? Semua sesi aktif akun ini akan berakhir.`)) return;
    setRevoking(userId);
    try {
      const { error } = await supabase.rpc('admin_force_logout', { target_user_id: userId });
      if (error) throw error;
      notify.success(`Sesi ${email} diakhiri.`);
      setSessions(prev => prev.filter(s => s.user_id !== userId));
    } catch (err) {
      notify.error(err.message || 'Gagal memaksa logout.');
    } finally {
      setRevoking('');
    }
  };

  return (
    <div className="panel tight">
      <div className="panel-head">
        <div><h3>Log Sistem</h3><p>Jejak audit, log error, dan sesi aktif — akses terbatas.</p></div>
        <div className="segmented">
          <button className={tab === 'audit' ? 'active' : ''} onClick={() => setTab('audit')}><ClipboardList size={13} /> Log Aktivitas</button>
          <button className={tab === 'error' ? 'active' : ''} onClick={() => setTab('error')}><AlertTriangle size={13} /> Log Error</button>
          {isSuperadmin && <button className={tab === 'sessions' ? 'active' : ''} onClick={() => setTab('sessions')}><Monitor size={13} /> Sesi Aktif</button>}
        </div>
      </div>
      {loading ? <div className="table-loading">Memuat...</div> : error ? <div className="table-empty" role="alert"><strong>{error}</strong></div> : tab === 'audit' ? (
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
      ) : tab === 'error' ? (
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
      ) : (
        sessions.length ? (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead><tr><th>User</th><th>Role</th><th>IP</th><th>User Agent</th><th>Login</th><th>Aktivitas Terakhir</th><th>Aksi</th></tr></thead>
              <tbody>{sessions.map(row => (
                <tr key={row.session_id}>
                  <td>{row.email}<br/><small style={{ color: 'var(--text-tertiary)' }}>{row.name}</small></td>
                  <td>{row.role}</td>
                  <td>{row.ip || '—'}</td>
                  <td className="cell-text" style={{ maxWidth: 220 }} title={row.user_agent}>{row.user_agent || '—'}</td>
                  <td>{formatDateTime(row.created_at)}</td>
                  <td>{formatDateTime(row.updated_at)}</td>
                  <td><button className="icon-btn" title="Paksa logout" disabled={revoking === row.user_id} onClick={() => forceLogout(row.user_id, row.email)}><LogOut size={15} /></button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <div className="table-empty"><strong>Tidak ada sesi aktif.</strong></div>
      )}
    </div>
  );
}
