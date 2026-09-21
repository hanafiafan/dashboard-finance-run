import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppProvider, useApp } from './contexts/AppContext';
import { Login, ResetPasswordConfirm } from './pages/Login';
import AppShell from './layouts/AppShell';
import StateScreen from './components/ui/StateScreen';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { ToastHost } from './components/ui/Toast';
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
  const { session, loading, demo, login, startDemo, logout, passwordRecovery, completePasswordReset } = useAuth();
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

  // Password-recovery link landing — takes priority over the boot spinner and
  // the normal login screen, since Supabase already gave this browser a
  // (recovery-scoped) session for whichever account the link was sent to.
  if (passwordRecovery) {
    return <ResetPasswordConfirm onSubmit={completePasswordReset} />;
  }

  // Loading spinner
  if (loading || status === 'init' || status === 'loading') return <StateScreen loading title="Menyiapkan ruang kerja Anda." description={status === 'loading' ? 'Memuat data keuangan dari server…' : 'Menghubungkan workspace…'} />;

  // Login page
  if (status === 'login') {
    return <Login onLogin={login} onDemo={startDemo} />;
  }

  // Data load failed — never fall back to demo data for a real session.
  if (status === 'error') return <StateScreen code="!" title="Koneksi belum berhasil." description="Data belum dapat dimuat. Coba hubungkan kembali untuk melanjutkan pekerjaan Anda." details={loadError} onRetry={loadLiveState} onBack={logout} />;

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
  if (!['/', '/index.html'].includes(window.location.pathname)) return <StateScreen code="404" title="Sepertinya Anda tersesat." description="Halaman ini tidak tersedia. Kembali ke workspace untuk melanjutkan pekerjaan Anda." />;
  return (
    <AuthProvider>
      <AppProvider>
        <AppRoot />
        <ToastHost />
      </AppProvider>
    </AuthProvider>
  );
}

