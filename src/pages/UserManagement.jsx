import { useState } from 'react';
import { Plus, Key, Trash2, X, UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getStoredUsers, saveStoredUsers, addUser, removeUser, resetUserPassword } from '../contexts/AuthContext';

export default function UserManagement() {
  const { session } = useAuth();
  const [users, setUsers] = useState(() => getStoredUsers());
  const [showAdd, setShowAdd] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);

  const isSuperadmin = session?.role === 'superadmin' || session?.role === 'finance';

  const refresh = () => setUsers(getStoredUsers());

  const handleAdd = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const email = fd.get('email').trim().toLowerCase();
    if (!email) return;
    addUser({
      email,
      name: fd.get('name').trim(),
      role: fd.get('role'),
      password: fd.get('password').trim(),
    });
    refresh();
    setShowAdd(false);
  };

  const handleDelete = (email) => {
    if (!window.confirm(`Hapus user ${email}?`)) return;
    removeUser(email);
    refresh();
  };

  const handleResetPassword = (e) => {
    e.preventDefault();
    const newPw = new FormData(e.target).get('password').trim();
    if (!newPw || !resetTarget) return;
    resetUserPassword(resetTarget.email, newPw);
    setResetTarget(null);
  };

  return (
    <div className="user-mgmt">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h3 style={{ margin: 0 }}>User Management</h3>
        {isSuperadmin && (
          <button className="btn blue sm" onClick={() => setShowAdd(true)}>
            <UserPlus size={14} /> Add User
          </button>
        )}
      </div>

      <table className="user-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Name</th>
            <th>Role</th>
            <th>Added</th>
            <th style={{ width: 140 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 && (
            <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>No users added yet — default credentials are hardcoded.</td></tr>
          )}
          {users.map(u => (
            <tr key={u.email}>
              <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem' }}>{u.email}</td>
              <td>{u.name}</td>
              <td><span className={`role-badge ${u.role}`}>{u.role}</span></td>
              <td style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString('id-ID') : '—'}</td>
              <td>
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                  {isSuperadmin && (
                    <button className="btn ghost sm" onClick={() => setResetTarget(u)} title="Reset password"><Key size={13} /></button>
                  )}
                  {isSuperadmin && (
                    <button className="btn ghost sm" onClick={() => handleDelete(u.email)} title="Delete" style={{ color: 'var(--rose)' }}><Trash2 size={13} /></button>
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
              <select name="role">
                <option value="finance">Finance</option>
                <option value="owner">Owner</option>
                <option value="pic_brand">PIC Brand</option>
              </select>
            </div>
            <div className="field">
              <label>Password</label>
              <input name="password" type="text" required placeholder="Min 6 characters" minLength={6} />
            </div>
            <div className="modal-actions">
              <button className="btn ghost" type="button" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn blue" type="submit">Add User</button>
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
              <button className="btn ghost" type="button" onClick={() => setResetTarget(null)}>Cancel</button>
              <button className="btn teal" type="submit">Reset Password</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
