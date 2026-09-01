import { useState, useEffect } from 'react';
import { Key, Trash2, X, UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getStoredUsers, addUser, removeUser, resetUserPassword } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { getRecords } from '../api/financeApi';

// Privileged actions (create/reset/delete) need the service_role key, which
// only api/manage-user.js holds — this just forwards the caller's own Supabase
// Auth token so the endpoint can verify who's asking before doing anything.
async function callManageUser(session, body) {
  const res = await fetch('/api/manage-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.accessToken}` },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Gagal.');
  return data;
}

export default function UserManagement() {
  const { session } = useAuth();
  const { app } = useApp();
  const [users, setUsers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newUserRole, setNewUserRole] = useState('finance');
  const [resetTarget, setResetTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const isSuperadmin = session?.role === 'superadmin';
  const canManageUsers = session?.permissions?.canManageUsers;
  const isDemo = session?.isDemo;
  const brands = app.state?.brands || [];
  const companies = [...new Set(brands.map(b => b.Company).filter(Boolean))];

  const refresh = async () => {
    if (isDemo) { setUsers(getStoredUsers()); return; }
    try {
      const { rows } = await getRecords('users', {}, session);
      setUsers((rows || []).map(r => ({ email: r.Email, name: r.Name, role: r.Role, active: r.Active, company_scope: r['Company Scope'], brand_scope: r['Brand Scope'] })));
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => { refresh(); }, [isDemo]);

  const openAdd = () => { setNewUserRole('finance'); setShowAdd(true); };

  const handleAdd = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const email = fd.get('email').trim().toLowerCase();
    if (!email) return;
    const role = fd.get('role');
    let brand_scope = null;
    let company_scope = null;
    if (role === 'pic_brand') {
      brand_scope = fd.get('brand_scope');
      if (!brand_scope) { setError('Pilih brand untuk PIC Brand ini.'); return; }
    } else if (role === 'owner') {
      // Brand is more specific than company — if both are picked, brand wins.
      brand_scope = fd.get('owner_brand') || null;
      company_scope = brand_scope ? null : (fd.get('owner_company') || null);
    }
    const payload = { email, name: fd.get('name').trim(), role, password: fd.get('password').trim(), brand_scope, company_scope };
    setBusy(true);
    setError('');
    try {
      if (isDemo) addUser(payload);
      else await callManageUser(session, { action: 'create', ...payload });
      await refresh();
      setShowAdd(false);
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  const handleDelete = async (email) => {
    if (!window.confirm(`Hapus user ${email}?`)) return;
    setBusy(true);
    setError('');
    try {
      if (isDemo) removeUser(email);
      else await callManageUser(session, { action: 'delete', targetEmail: email });
      await refresh();
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    const newPw = new FormData(e.target).get('password').trim();
    if (!newPw || !resetTarget) return;
    setBusy(true);
    setError('');
    try {
      if (isDemo) resetUserPassword(resetTarget.email, newPw);
      else await callManageUser(session, { action: 'reset-password', targetEmail: resetTarget.email, password: newPw });
      setResetTarget(null);
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  return (
    <div className="user-mgmt">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h3 style={{ margin: 0 }}>User Management</h3>
        {canManageUsers && (
          <button className="btn blue sm" onClick={openAdd} disabled={busy}>
            <UserPlus size={14} /> Add User
          </button>
        )}
      </div>

      {error && <p className="login-error" style={{ marginBottom: '0.75rem' }}>{error}</p>}

      <table className="user-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Name</th>
            <th>Role</th>
            <th>Scope</th>
            <th>Active</th>
            <th style={{ width: 140 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 && (
            <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>Belum ada user.</td></tr>
          )}
          {users.map(u => (
            <tr key={u.email}>
              <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem' }}>{u.email}</td>
              <td>{u.name}</td>
              <td><span className={`role-badge ${u.role}`}>{u.role}</span></td>
              <td style={{ fontSize: '0.75rem' }}>
                {u.role === 'pic_brand'
                  ? (u.brand_scope || <span style={{ color: 'var(--rose)' }}>belum diatur</span>)
                  : u.role === 'owner'
                  ? (u.brand_scope || u.company_scope || <span style={{ color: 'var(--text-tertiary)' }}>Semua Entitas</span>)
                  : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
              </td>
              <td style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{u.active === false ? 'Nonaktif' : 'Aktif'}</td>
              <td>
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                  {canManageUsers && (
                    <button className="btn ghost sm" onClick={() => setResetTarget(u)} disabled={busy} title="Reset password"><Key size={13} /></button>
                  )}
                  {canManageUsers && (
                    <button className="btn ghost sm" onClick={() => handleDelete(u.email)} disabled={busy} title="Delete" style={{ color: 'var(--rose)' }}><Trash2 size={13} /></button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Add User Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowAdd(false); }}>
          <form className="modal-box" onSubmit={handleAdd}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Add New User</h3>
              <button className="btn ghost sm" onClick={() => setShowAdd(false)} type="button"><X size={16} /></button>
            </div>
            <div className="field">
              <label>Email</label>
              <input name="email" type="email" required placeholder="user@domain.com" />
            </div>
            <div className="field">
              <label>Name</label>
              <input name="name" type="text" required placeholder="Full Name" />
            </div>
            <div className="field">
              <label>Role</label>
              <select name="role" value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)}>
                {isSuperadmin && <option value="superadmin">Super Admin</option>}
                <option value="finance">Finance</option>
                <option value="owner">Owner</option>
                <option value="pic_brand">PIC Brand</option>
              </select>
            </div>
            {newUserRole === 'pic_brand' && (
              <div className="field">
                <label>Brand (PIC untuk brand ini)</label>
                <select name="brand_scope" required defaultValue="">
                  <option value="" disabled>Pilih brand...</option>
                  {brands.map((b) => (
                    <option key={b['Brand Key']} value={b['Brand Key']}>{b.Brand} — {b.Company}</option>
                  ))}
                </select>
              </div>
            )}
            {newUserRole === 'owner' && (
              <>
                <div className="field">
                  <label>Perusahaan (kosongkan untuk akses semua perusahaan)</label>
                  <select name="owner_company" defaultValue="">
                    <option value="">Semua Perusahaan</option>
                    {companies.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Atau batasi ke satu entitas/brand saja (opsional)</label>
                  <select name="owner_brand" defaultValue="">
                    <option value="">Semua entitas di perusahaan terpilih</option>
                    {brands.map((b) => (
                      <option key={b['Brand Key']} value={b['Brand Key']}>{b.Brand} — {b.Company}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
            <div className="field">
              <label>Password</label>
              <input name="password" type="text" required placeholder="Min 6 characters" minLength={6} />
            </div>
            <div className="modal-actions">
              <button className="btn ghost" type="button" onClick={() => setShowAdd(false)} disabled={busy}>Cancel</button>
              <button className="btn blue" type="submit" disabled={busy}>Add User</button>
            </div>
          </form>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetTarget && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setResetTarget(null); }}>
          <form className="modal-box" onSubmit={handleResetPassword}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Reset Password</h3>
              <button className="btn ghost sm" onClick={() => setResetTarget(null)} type="button"><X size={16} /></button>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Resetting password for <strong>{resetTarget.email}</strong></p>
            <div className="field">
              <label>New Password</label>
              <input name="password" type="text" required placeholder="Min 6 characters" minLength={6} autoFocus />
            </div>
            <div className="modal-actions">
              <button className="btn ghost" type="button" onClick={() => setResetTarget(null)} disabled={busy}>Cancel</button>
              <button className="btn teal" type="submit" disabled={busy}>Reset Password</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
