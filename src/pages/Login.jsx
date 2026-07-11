import { useState } from 'react';
import { LogIn, Sparkles, Eye, EyeOff, Shield, Key, User, Building2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function Login({ onLogin, onDemo }) {
  const { isProduction, loginError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim()) return setError('Masukkan email.');
    if (!password.trim()) return setError('Masukkan password.');
    setError('');
    setLoading(true);
    await onLogin(email.trim().toLowerCase(), password.trim());
    setLoading(false);
  };

  const displayError = error || loginError;

  return (
    <div className="login-screen">
      <div className="login-bg-decor">
        <div className="glow-orb orb-1" />
        <div className="glow-orb orb-2" />
      </div>

      <section className="login-card">
        <div className="login-header">
          <div className="brand-mark">RN</div>
          <h1>Dashboard Finance RUN</h1>
          <p>Multi-company & multi-brand finance operating system</p>
        </div>

        <div className="login-fields">
          <div className="login-field">
            <User size={16} className="field-icon" />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              disabled={loading}
            />
          </div>
          <div className="login-field">
            <Key size={16} className="field-icon" />
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              disabled={loading}
            />
            <button className="pw-toggle" onClick={() => setShowPw(!showPw)} tabIndex={-1}>
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {displayError && <p className="login-error">{displayError}</p>}
        </div>

        <div className="login-actions">
          <button className="btn blue" onClick={handleLogin} disabled={loading}>
            <LogIn size={18} /> {loading ? 'Memproses...' : 'Masuk'}
          </button>
          {!isProduction && (
            <button className="btn ghost" onClick={onDemo} disabled={loading}>
              <Sparkles size={18} /> Preview Demo
            </button>
          )}
        </div>

        {!isProduction && (
          <div className="login-hints">
            <div className="hint-card">
              <Shield size={13} /><span><strong>Admin</strong> — admin@runfinance.com / superadmin123</span>
            </div>
            <div className="hint-card">
              <Shield size={13} /><span><strong>Finance</strong> — finance@runfinance.com / finance123</span>
            </div>
            <div className="hint-card">
              <Building2 size={13} /><span><strong>Owner</strong> — owner@runfinance.com / owner123</span>
            </div>
            <div className="hint-card">
              <User size={13} /><span><strong>PIC</strong> — pic@runfinance.com / pic123</span>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
