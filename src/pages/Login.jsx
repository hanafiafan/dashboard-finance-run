import { useState } from 'react';
import { LogIn, Sparkles, Eye, EyeOff, Shield, Key, User, Building2 } from 'lucide-react';

export function Login({ onLogin, onDemo }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);

  const handleLogin = () => {
    if (!email.trim()) return setError('Masukkan email.');
    if (!password.trim()) return setError('Masukkan password.');
    setError('');
    onLogin(email.trim().toLowerCase(), password.trim());
  };

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
            />
            <button className="pw-toggle" onClick={() => setShowPw(!showPw)} tabIndex={-1}>
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {error && <p className="login-error">{error}</p>}
        </div>

        <div className="login-actions">
          <button className="btn blue" onClick={handleLogin}>
            <LogIn size={18} /> Masuk
          </button>
          <button className="btn ghost" onClick={onDemo}>
            <Sparkles size={18} /> Preview Demo
          </button>
        </div>

        <div className="login-hints">
          <div className="hint-card">
            <Shield size={13} /><span><strong>Finance</strong> — finance@domain.com / admin123</span>
          </div>
          <div className="hint-card">
            <Building2 size={13} /><span><strong>Owner</strong> — owner@domain.com / owner123</span>
          </div>
          <div className="hint-card">
            <User size={13} /><span><strong>PIC</strong> — pic@domain.com / pic123</span>
          </div>
        </div>
      </section>
    </div>
  );
}
