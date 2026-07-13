import { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppProvider, useApp } from './contexts/AppContext';
import { Login } from './pages/Login';
import AppShell from './layouts/AppShell';
import { RefreshCw } from 'lucide-react';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { getAppState } from './api/financeApi';

// Chart.js — MUST register ALL controllers + elements before any chart renders
import {
  Chart as ChartJS,
  // Controllers (REQUIRED for tree-shaking in production)
  LineController,
  BarController,
  DoughnutController,
  PieController,
  PolarAreaController,
  RadarController,
  ScatterController,
  BubbleController,
  // Elements
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  // Scales
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  LogarithmicScale,
  TimeScale,
  // Plugins
  Filler,
  Legend,
  Title,
  Tooltip,
} from 'chart.js';
ChartJS.register(
  // Controllers
  LineController,
  BarController,
  DoughnutController,
  PieController,
  PolarAreaController,
  RadarController,
  ScatterController,
  BubbleController,
  // Elements
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  // Scales
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  LogarithmicScale,
  TimeScale,
  // Plugins
  Filler,
  Legend,
  Title,
  Tooltip,
);

function AppContent() {
  const { session, loading, demo, login, startDemo, logout } = useAuth();
  const { app, loadDemo, setState } = useApp();
  const [status, setStatus] = useState('init'); // init → login → loading → ready → error
  const [errorMsg, setErrorMsg] = useState('');

  const loadLive = useCallback(() => {
    setStatus('loading');
    getAppState(app.filters, session)
      .then(newState => { setState(newState); setStatus('ready'); })
      .catch(err => {
        console.error('getAppState failed:', err);
        setErrorMsg(err?.message || 'Gagal memuat data dari server.');
        setStatus('error');
      });
  }, [app.filters, session, setState]);

  useEffect(() => {
    if (loading) return;

    if (!session) {
      setStatus('login');
      return;
    }

    if (demo || session.isDemo) {
      loadDemo(session);
      setStatus('ready');
      return;
    }

    // Live mode — fetch initial state from API (no demo fallback)
    loadLive();
  }, [session, loading, demo, loadDemo, loadLive]);

  // Loading spinner
  if (loading || status === 'init' || status === 'loading') {
    return (
      <div className="boot">
        <div className="boot-panel">
          <div className="brand-mark">RN</div>
          <strong>Dashboard Finance RUN</strong>
          <span>{status === 'loading' ? 'Memuat data dari server...' : 'Menghubungkan dashboard...'}</span>
          <RefreshCw size={20} className="spin" style={{ marginTop: 8, opacity: 0.5 }} />
        </div>
      </div>
    );
  }

  // Error state — live data load failed (do NOT show fake demo data)
  if (status === 'error') {
    return (
      <div className="boot">
        <div className="boot-panel">
          <div className="brand-mark">RN</div>
          <strong>Gagal memuat data</strong>
          <span style={{ maxWidth: 380, textAlign: 'center', opacity: 0.7 }}>{errorMsg}</span>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn blue" onClick={loadLive}>
              <RefreshCw size={16} /> Coba lagi
            </button>
            <button className="btn ghost" onClick={logout}>Keluar</button>
          </div>
        </div>
      </div>
    );
  }

  // Login page
  if (status === 'login') {
    return <Login onLogin={login} onDemo={startDemo} />;
  }

  // Dashboard
  return <AppShell />;
}

function AppRoot() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppRoot />
      </AppProvider>
    </AuthProvider>
  );
}

