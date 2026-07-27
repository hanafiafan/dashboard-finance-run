import { useState, useEffect } from 'react';
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
  const [loadError, setLoadError] = useState('');

  const loadLiveState = () => {
    setStatus('loading');
    setLoadError('');
    getAppState(app.filters, session)
      .then(newState => { setState(newState); setStatus('ready'); })
      .catch(err => {
        console.error('Gagal memuat data dashboard:', err);
        setLoadError(err.message || 'Gagal memuat data dari server.');
        setStatus('error');
      });
  };

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

    // Live mode — fetch initial state from API. On failure we show a real error
    // instead of silently substituting demo data — this is a real finance tool,
    // showing fabricated numbers as if they were live data is worse than an error screen.
    loadLiveState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, loading, demo, loadDemo, setState]);

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

  // Login page
  if (status === 'login') {
    return <Login onLogin={login} onDemo={startDemo} />;
  }

  // Data load failed — never fall back to demo data for a real session.
  if (status === 'error') {
    return (
      <div className="boot">
        <div className="boot-panel">
          <div className="brand-mark">RN</div>
          <strong>Gagal memuat data dashboard</strong>
          <span>{loadError}</span>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn blue" onClick={loadLiveState}>Coba Lagi</button>
            <button className="btn ghost" onClick={logout}>Keluar & Login Ulang</button>
          </div>
        </div>
      </div>
    );
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

