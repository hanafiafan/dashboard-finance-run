import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Layers3 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function Login({ onLogin, onDemo }) {
  const { isProduction, loginError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const handleLogin = async e => {
    e.preventDefault();
    if (!email.trim() || !password) return setError('Lengkapi email dan kata sandi Anda.');
    setError(''); setLoading(true);
    try { await onLogin(email.trim().toLowerCase(), password); }
    catch { setError('Tidak dapat masuk. Periksa koneksi lalu coba lagi.'); }
    finally { setLoading(false); }
  };
  const displayError = error || loginError;
  return <main className="auth-page">
    <section className="auth-art" aria-label="RUN Finance">
      <img src="/art/finance-sculpture.jpg" alt="" fetchPriority="high" />
      <a className="auth-brand" href="#login-form"><span className="brand-mark">R</span> RUN <span>finance</span></a>
      <div className="auth-story"><span className="overline">YOUR FINANCE, IN FOCUS</span><h1>Lebih terarah.<br/>Lebih terkendali.</h1><p>Satu ruang untuk melihat keuangan<br/>dan menggerakkan bisnis Anda.</p></div>
      <div className="auth-art-footer"><Layers3 size={16}/><span>Multi-company. Multi-brand. Satu pandangan.</span></div>
    </section>
    <section className="auth-form-side" id="login-form">
      <div className="auth-topline"><span>Workspace keuangan</span><span className="auth-version">RUN / 02</span></div>
      <div className="auth-form-content"><span className="auth-welcome-icon"><LockKeyhole size={22}/></span><p className="overline">SELAMAT DATANG KEMBALI</p><h2>Masuk ke workspace.</h2><p className="auth-subtitle">Kelola keuangan dengan pandangan yang lebih jelas.</p>
        <form onSubmit={handleLogin} className="auth-form">
          <div className="auth-field-group"><label htmlFor="login-email">Email kerja</label><div className="auth-input"><Mail size={17}/><input id="login-email" type="email" autoComplete="username" placeholder="nama@perusahaan.com" value={email} onChange={e => setEmail(e.target.value)} required disabled={loading}/></div></div>
          <div className="auth-field-group"><label htmlFor="login-password">Kata sandi</label><div className="auth-input"><LockKeyhole size={17}/><input id="login-password" type={showPw ? 'text' : 'password'} autoComplete="current-password" placeholder="Masukkan kata sandi" value={password} onChange={e => setPassword(e.target.value)} required disabled={loading}/><button type="button" aria-label={showPw ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'} aria-pressed={showPw} onClick={() => setShowPw(!showPw)}>{showPw ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></div>
          {displayError && <p className="auth-error" role="alert">{displayError}</p>}
          <button className="btn auth-submit" type="submit" disabled={loading}>{loading ? 'Menghubungkan...' : 'Masuk ke dashboard'}<ArrowRight size={17}/></button>
        </form>
        {!isProduction && <><div className="auth-divider"><span>atau jelajahi terlebih dahulu</span></div><button className="btn auth-demo" onClick={onDemo} disabled={loading}>Buka workspace demo <ArrowRight size={16}/></button><details className="demo-access"><summary>Akun pengujian lokal</summary><p>Data contoh untuk mencoba antarmuka.</p><dl><dt>Admin</dt><dd>admin@runfinance.com / superadmin123</dd><dt>Finance</dt><dd>finance@runfinance.com / finance123</dd><dt>Owner</dt><dd>owner@runfinance.com / owner123</dd><dt>PIC</dt><dd>pic@runfinance.com / pic123</dd></dl></details></>}
      </div><footer className="auth-footer"><ShieldCheck size={15}/><span>Akses mengikuti peran dan cakupan perusahaan Anda.</span></footer>
    </section>
  </main>;
}
