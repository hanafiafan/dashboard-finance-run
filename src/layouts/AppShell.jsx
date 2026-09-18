import { lazy, Suspense, useCallback, useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, ChartNoAxesCombined, Table2, BadgeCheck,
  Settings2, RefreshCw, LogOut, BookOpen, Target, Bell
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { getAppState } from '../api/financeApi';
import { notify } from '../components/ui/Toast';
import CommandCenter from '../pages/CommandCenter';
const Analytics = lazy(() => import('../pages/Analytics').then(m => ({ default: m.Analytics })));
const Operations = lazy(() => import('../pages/Operations').then(m => ({ default: m.Operations })));
const Approval = lazy(() => import('../pages/Approval').then(m => ({ default: m.Approval })));
const Master = lazy(() => import('../pages/Master').then(m => ({ default: m.Master })));
const ForecastingControlling = lazy(() => import('../pages/ForecastingControlling').then(m => ({ default: m.ForecastingControlling })));
const Documentation = lazy(() => import('../pages/Documentation').then(m => ({ default: m.Documentation })));
import { VIEW_TITLES } from '../utils/constants';
import { formatDateTime } from '../utils/formatters';
import FilterBar from '../components/filters/FilterBar';
import Velaris from '../components/ui/Velaris';
import AccountSecurity from '../components/ui/AccountSecurity';

const NAV_ITEMS = [
  { view: 'command', icon: LayoutDashboard, label: 'Dashboard' },
  { view: 'analytics', icon: ChartNoAxesCombined, label: 'Analytics' },
  { view: 'operations', icon: Table2, label: 'Operasional' },
  { view: 'forecast_controlling', icon: Target, label: 'Forecasting & Controlling' },
  { view: 'approval', icon: BadgeCheck, label: 'Approval' },
  { view: 'master', icon: Settings2, label: 'Master Data' },
  { view: 'documentation', icon: BookOpen, label: 'Dokumentasi' },
];

export default function AppShell() {
  const { app, setView, setState } = useApp();
  const { session, demo, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [syncError, setSyncError] = useState('');
  const requestId = useRef(0);

  const state = app.state;
  const filters = app.filters;
  const pendingApproval = state?.dashboard?.summary?.pendingApproval || 0;

  // Only the latest request may update the dashboard after quick filter changes.
  useEffect(() => {
    const id = ++requestId.current;
    let disposed = false;
    setRefreshing(true);
    setSyncError('');
    getAppState(filters, session)
      .then(newState => { if (!disposed && id === requestId.current) setState(newState); })
      .catch(err => { if (!disposed && id === requestId.current) { setSyncError(err.message || 'Gagal memuat ulang data.'); notify.error(err.message || 'Gagal memuat ulang data.'); } })
      .finally(() => { if (!disposed && id === requestId.current) setRefreshing(false); });
    return () => { disposed = true; };
  }, [filters, session, setState]);

  const handleRefresh = useCallback(async () => {
    const id = ++requestId.current;
    setRefreshing(true);
    setSyncError('');
    try {
      const newState = await getAppState(filters, session);
      if (id === requestId.current) setState(newState);
    } catch (err) { if (id === requestId.current) { setSyncError(err.message || 'Gagal memuat ulang data.'); notify.error(err.message || 'Gagal memuat ulang data.'); } }
    finally { if (id === requestId.current) setRefreshing(false); }
  }, [filters, session, setState]);

  if (!state) {
    return (
      <div className="boot">
        <div className="boot-panel">
          <div className="brand-mark">RN</div>
          <strong>Dashboard Finance RUN</strong>
          <span>Memuat data dashboard...</span>
          <RefreshCw size={16} className="spin" style={{ marginTop: 8, opacity: 0.5 }} />
        </div>
      </div>
    );
  }

  const renderView = () => {
    switch (app.view) {
      case 'command': return <CommandCenter />;
      case 'analytics': return <Analytics />;
      case 'operations': return <Operations />;
      case 'forecast_controlling': return <ForecastingControlling />;
      case 'approval': return <Approval />;
      case 'master': return <Master />;
      case 'documentation': return <Documentation />;
      default: return <CommandCenter />;
    }
  };

  return (
    <>
    <Velaris className="app-bg" height="100vh" bg="#000000" speed={0.5} grain={0.15} />
    <div className={`app-shell view-${app.view}`}>
      <header className="workspace-header">
        <div className="workspace-brand"><div className="brand-mark">R</div><strong>RUN<span>finance</span></strong></div>
        <button className="notif-bell" aria-label="Pengajuan menunggu approval" onClick={() => setView('approval')}>
          <Bell size={18} />
          {pendingApproval > 0 && <span className="notif-badge">{pendingApproval > 99 ? '99+' : pendingApproval}</span>}
        </button>
        <button type="button" className="workspace-user" onClick={() => !demo && setSecurityOpen(true)} title={demo ? undefined : 'Keamanan akun'}><span className="user-avatar">{(session?.name || 'U').slice(0, 1)}</span><div><strong>{session?.name || 'User'}</strong><small>{demo ? 'Mode demo · data contoh' : session?.role}</small></div></button>
        {!demo && <AccountSecurity isOpen={securityOpen} onClose={() => setSecurityOpen(false)} />}
      </header>
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark">RN</div>
          <div>
            <h1>Finance RUN</h1>
            <span>Multi-company OS</span>
          </div>
        </div>
        <div className="account-card">
          <strong>{session?.name || session?.email || 'User'}</strong>
          <span className="role-pill"><BadgeCheck size={14} />{session?.role || (demo ? 'demo' : 'guest')}</span>
        </div>
        <nav className="nav" aria-label="Semua menu">
          {NAV_ITEMS.map(({ view, icon: Icon, label }) => (
            <button key={view} title={label} aria-label={label} aria-current={app.view === view ? 'page' : undefined} className={app.view === view ? 'active' : ''} onClick={() => setView(view)}>
              <Icon size={18} /><span>{view === 'forecast_controlling' ? 'Forecast' : view === 'documentation' ? 'Panduan' : view === 'master' ? 'Master' : label}</span>
            </button>
          ))}
        </nav>
        <div className="side-footer">
          <button className="btn ghost" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw size={16} className={refreshing ? 'spin' : ''} /> Refresh
          </button>
          <button className="btn ghost" title="Keluar" aria-label="Keluar" onClick={logout}><LogOut size={16} /></button>
          <div className="side-note">Updated: {formatDateTime(state?.dashboard?.generatedAt)}</div>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div>
            <p className="eyebrow">WORKSPACE / {VIEW_TITLES[app.view] || 'Dashboard'}</p>
            <h2 className="page-title">{app.view === 'command' ? `Ringkasan keuangan` : VIEW_TITLES[app.view] || 'Dashboard'}</h2><p className="page-description">{({command:'Satu pandangan untuk saldo, aktivitas, dan kesehatan keuangan Anda.',analytics:'Temukan pola arus kas dan bandingkan kinerja setiap brand.',operations:'Catat transaksi, kelola rekening, dan temukan data dengan cepat.',forecast_controlling:'Rencanakan anggaran dan pantau realisasi dalam satu laporan.',approval:'Tinjau kebutuhan dana dan ambil keputusan dengan konteks yang lengkap.',master:'Kelola data referensi yang digunakan di seluruh workspace.',documentation:'Panduan praktis untuk alur kerja keuangan sehari-hari.'})[app.view]}</p>
          </div>
          <div className="top-actions">
            <button className="btn blue" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw size={16} className={refreshing ? 'spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        <FilterBar />

        {syncError && <div className="sync-error" role="alert">Pembaruan gagal. Data di bawah adalah data terakhir yang berhasil dimuat dan mungkin belum sesuai filter. {syncError}</div>}
        <section id="view-content" className="view active" aria-busy={refreshing}><Suspense fallback={<div className="empty">Memuat modul...</div>}>{renderView()}</Suspense></section>
      </main>
      <div id="toast" className="toast" aria-live="polite"></div>
    </div>
    </>
  );
}
