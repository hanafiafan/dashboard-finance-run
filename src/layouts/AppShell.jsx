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
import { formatDateTime, money } from '../utils/formatters';
import FilterBar from '../components/filters/FilterBar';
import StateScreen from '../components/ui/StateScreen';
import AccountSecurity from '../components/ui/AccountSecurity';
import { useIdleLogout } from '../hooks/useIdleLogout';

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
  const { app, setView, setState, setEntity } = useApp();
  const { session, demo, logout } = useAuth();
  const { warning: idleWarning, stayLoggedIn } = useIdleLogout(logout, !demo);
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

  if (!state) return <StateScreen loading title="Menyiapkan workspace." description="Ringkasan keuangan Anda sedang dimuat." />;

  const renderView = () => {
    switch (app.view) {
      case 'command': return <CommandCenter />;
      case 'analytics': return <Analytics />;
      case 'operations': return <Operations />;
      case 'forecast_controlling': return <ForecastingControlling />;
      case 'approval': return <Approval />;
      case 'master': return <Master />;
      case 'documentation': return <Documentation />;
      default: return <StateScreen compact code="404" title="Halaman tidak ditemukan." description="Pilih menu untuk melanjutkan pekerjaan Anda." onRetry={() => setView('command')} />;
    }
  };

  return (
    <>
    <div className={`app-shell view-${app.view}`}>
      <header className="workspace-header">
        <button className="workspace-brand" aria-label="RUN Finance — dashboard" onClick={() => setView('command')}>run<span>finance</span><i/></button>
        <nav className="workspace-nav" aria-label="Semua menu">{NAV_ITEMS.map(({ view, label }) => <button key={view} aria-label={label} aria-current={app.view === view ? 'page' : undefined} className={app.view === view ? 'active' : ''} onClick={() => setView(view)}>{view === 'forecast_controlling' ? 'Forecast' : view === 'documentation' ? 'Panduan' : view === 'master' ? 'Master data' : label}</button>)}</nav>
        <div className="workspace-tools">
        <button className="notif-bell" aria-label="Pengajuan menunggu approval" onClick={() => setView('approval')}>
          <Bell size={18} />
          {pendingApproval > 0 && <span className="notif-badge">{pendingApproval > 99 ? '99+' : pendingApproval}</span>}
        </button>
        <button type="button" className="workspace-user" aria-label={demo ? 'Akun demo' : `Keamanan akun ${session?.name || 'pengguna'}`} onClick={() => !demo && setSecurityOpen(true)} title={demo ? undefined : 'Keamanan akun'}><span className="user-avatar">{(session?.name || 'U').slice(0, 1)}</span><div><strong>{session?.name || 'User'}</strong><small>{demo ? 'Mode demo · data contoh' : session?.role}</small></div></button>
        <button className="icon-btn logout-btn" title="Keluar" aria-label="Keluar" onClick={logout}><LogOut size={17}/></button></div>
        {!demo && <AccountSecurity isOpen={securityOpen} onClose={() => setSecurityOpen(false)} />}
      </header>

      <main className="main">
        <div className="topbar">
          <div>
            <p className="eyebrow">{app.view === 'command' ? `Selamat datang, ${(session?.name || 'tim RUN').split(' ')[0]}` : `WORKSPACE / ${VIEW_TITLES[app.view] || 'Dashboard'}`}</p>
            <h2 className="page-title">{app.view === 'command' ? `Finance dashboard` : VIEW_TITLES[app.view] || 'Dashboard'}</h2><p className="page-description">{({command:'Satu pandangan untuk saldo, aktivitas, dan kesehatan keuangan Anda.',analytics:'Temukan pola arus kas dan bandingkan kinerja setiap brand.',operations:'Catat transaksi, kelola rekening, dan temukan data dengan cepat.',forecast_controlling:'Rencanakan anggaran dan pantau realisasi dalam satu laporan.',approval:'Tinjau kebutuhan dana dan ambil keputusan dengan konteks yang lengkap.',master:'Kelola data referensi yang digunakan di seluruh workspace.',documentation:'Panduan praktis untuk alur kerja keuangan sehari-hari.'})[app.view]}</p>
          </div>
          {app.view === 'command' ? <div className="headline-stats">{[{label:'Saldo rekening',value:state.dashboard?.summary?.bankBalance,entity:'bank'},{label:'Pemasukan',value:state.dashboard?.summary?.cashIn,entity:'income'},{label:'Pengeluaran',value:state.dashboard?.summary?.cashOut,entity:'outcome'}].map(item => <button key={item.entity} onClick={() => { setEntity(item.entity); setView('operations'); }}><span>{item.label}<small>IDR</small></span><strong>{money.format(Number(item.value || 0))}</strong></button>)}</div> : null}
        </div>

        <FilterBar />
        <div className="workspace-status" role="status"><span className={`data-state ${syncError ? 'failed' : ''}`}><i/>{refreshing ? 'Memperbarui data…' : syncError ? 'Data belum diperbarui' : demo ? 'Demo · data contoh' : 'Data workspace'}</span><span>Terakhir dimuat: {formatDateTime(state?.dashboard?.generatedAt)}</span><button className="status-refresh" onClick={handleRefresh} disabled={refreshing}><RefreshCw size={13} className={refreshing ? 'spin' : ''}/> Refresh</button><span className="workspace-currency">Mata uang · IDR</span></div>

        {syncError && <div className="sync-error" role="alert">Pembaruan gagal. Data di bawah adalah data terakhir yang berhasil dimuat dan mungkin belum sesuai filter. {syncError}</div>}
        <section id="view-content" className="view active" aria-busy={refreshing}><Suspense fallback={<div className="empty">Memuat modul...</div>}>{renderView()}</Suspense></section>
      </main>
      {idleWarning && (
        <div className="idle-warning" role="alertdialog" aria-label="Peringatan sesi akan berakhir">
          <span>Sesi akan berakhir karena tidak ada aktivitas.</span>
          <button className="btn primary" onClick={stayLoggedIn}>Tetap masuk</button>
        </div>
      )}
    </div>
    </>
  );
}
