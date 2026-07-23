import { useCallback, useState, useMemo, useEffect, useRef } from 'react';
import {
  LayoutDashboard, ChartNoAxesCombined, Table2, BadgeCheck,
  Settings2, RefreshCw, LogOut, DownloadCloud, Download, Sun, Moon, BookOpen
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { getAppState, importFromSources } from '../api/financeApi';
import CommandCenter from '../pages/CommandCenter';
import { Analytics } from '../pages/Analytics';
import { Operations } from '../pages/Operations';
import { Approval } from '../pages/Approval';
import { Master } from '../pages/Master';
import { Documentation } from '../pages/Documentation';
import { VIEW_TITLES } from '../utils/constants';
import { formatDateTime } from '../utils/formatters';
import FilterBar from '../components/filters/FilterBar';
import StatusBar from '../components/ui/StatusBar';

const NAV_ITEMS = [
  { view: 'command', icon: LayoutDashboard, label: 'Dashboard' },
  { view: 'analytics', icon: ChartNoAxesCombined, label: 'Analytics' },
  { view: 'operations', icon: Table2, label: 'Operasional' },
  { view: 'approval', icon: BadgeCheck, label: 'Approval' },
  { view: 'master', icon: Settings2, label: 'Master Data' },
  { view: 'documentation', icon: BookOpen, label: 'Dokumentasi' },
];

export default function AppShell() {
  const { app, setView, setState, setFilters } = useApp();
  const { session, demo, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const prevFiltersRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const state = app.state;
  const filters = app.filters;
  const stateBrands = state?.brands || [];

  // Re-fetch on filter change
  useEffect(() => {
    const fKey = JSON.stringify(filters);
    if (prevFiltersRef.current === fKey) return;
    prevFiltersRef.current = fKey;
    if (!state) return;
    setRefreshing(true);
    getAppState(filters, session)
      .then(newState => { setState(newState); setLastSyncAt(newState?.generatedAt || new Date().toISOString()); })
      .catch(console.error)
      .finally(() => setRefreshing(false));
  }, [filters.company, filters.brandKey, filters.startDate, filters.endDate, filters.year, filters.category]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const newState = await getAppState(filters, session);
      setState(newState);
      setLastSyncAt(newState?.generatedAt || new Date().toISOString());
    } catch (err) { console.error(err); }
    setRefreshing(false);
  }, [filters, session, setState]);

  const handleImport = useCallback(async () => {
    if (!window.confirm('Import data dari Source_Workbooks sekarang?')) return;
    try {
      const result = await importFromSources(session);
      const total = (result.results || []).reduce((sum, item) => sum + Number(item.imported || 0), 0);
      alert(`${total} baris diproses.`);
      await handleRefresh();
    } catch (err) { alert(err.message); }
  }, [session, handleRefresh]);

  const exportCurrentCsv = useCallback(() => {
    const entity = app.view === 'master' ? app.master : app.entity;
    const rows = app.rows[entity] || [];
    if (!rows.length) return alert('Tidak ada data.');
    const cols = Object.keys(rows[0]);
    const csv = [cols.join(','), ...rows.map(row => cols.map(col => `"${String(row[col] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `finance-${entity}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }, [app.view, app.master, app.entity, app.rows]);

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

  const canApprove = session?.permissions?.canApprove;
  const canImport = session?.role === 'superadmin' || session?.role === 'finance';

  const renderView = () => {
    switch (app.view) {
      case 'command': return <CommandCenter />;
      case 'analytics': return <Analytics />;
      case 'operations': return <Operations />;
      case 'approval': return <Approval />;
      case 'master': return <Master />;
      case 'documentation': return <Documentation />;
      default: return <CommandCenter />;
    }
  };

  return (
    <div className="app-shell">
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
        <nav className="nav">
          {NAV_ITEMS.map(({ view, icon: Icon, label }) => (
            <button key={view} className={app.view === view ? 'active' : ''} onClick={() => setView(view)}>
              <Icon size={18} /> {label}
            </button>
          ))}
        </nav>
        <div className="side-footer">
          <button className="btn ghost" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw size={16} className={refreshing ? 'spin' : ''} /> Refresh
          </button>
          {!demo && <button className="btn ghost" onClick={logout}><LogOut size={16} /> Keluar</button>}
          <div className="side-note">Updated: {formatDateTime(state?.dashboard?.generatedAt)}</div>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div>
            <p className="eyebrow">Finance operating system</p>
            <h2 className="page-title">{VIEW_TITLES[app.view] || 'Dashboard'}</h2>
          </div>
          <div className="top-actions">
            <div className="theme-toggle" onClick={toggleTheme} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
              <span className={theme === 'light' ? 'active' : ''}><Sun size={14} /> Light</span>
              <span className={theme === 'dark' ? 'active' : ''}><Moon size={14} /> Dark</span>
            </div>
            {canImport && <button className="btn amber" onClick={handleImport}><DownloadCloud size={16} /> Import</button>}
            {app.entity && <button className="btn ghost" onClick={exportCurrentCsv}><Download size={16} /> CSV</button>}
            <button className="btn blue" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw size={16} className={refreshing ? 'spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        <FilterBar />

        <StatusBar app={app} demo={demo} lastSyncAt={lastSyncAt || state?.generatedAt} />

        <section id="view-content" className="view active">{renderView()}</section>
      </main>
      <div id="toast" className="toast" aria-live="polite"></div>
    </div>
  );
}
