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
  const { session, loading, demo, login, startDemo } = useAuth();
  const { app, loadDemo, setState } = useApp();
  const [status, setStatus] = useState('init'); // init → login → loading → ready

  useEffect(() => {
    if (loading) return;

    if (!session) {
      setStatus('login');
      return;
    }

    if (demo || session.isDemo) {
      loadDemo();
      setStatus('ready');
      return;
    }

    // Live mode — fetch initial state from API
    setStatus('loading');
    getAppState(app.filters, session)
      .then(newState => { setState(newState); setStatus('ready'); })
      .catch(() => {
        loadDemo();
        setStatus('ready');
      });
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

