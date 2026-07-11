import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppProvider, useApp } from './contexts/AppContext';
import { Login } from './pages/Login';
import AppShell from './layouts/AppShell';
import { getAppState } from './api/financeApi';
import { RefreshCw } from 'lucide-react';
import ErrorBoundary from './components/ui/ErrorBoundary';

// Chart.js — MUST register before any chart component renders
import {
  Chart as ChartJS,
  RadialLinearScale, PointElement, LineElement, Filler,
  Tooltip, Legend, ArcElement, CategoryScale, LinearScale,
  BarElement, Title,
} from 'chart.js';
ChartJS.register(
  RadialLinearScale, PointElement, LineElement, Filler,
  Tooltip, Legend, ArcElement, CategoryScale, LinearScale,
  BarElement, Title
);

function AppContent() {
  const { session, loading, login, startDemo, demo } = useAuth();
  const { app, setState, loadDemo } = useApp();
  const [status, setStatus] = useState('init'); // init|loading|login|ready
  const [trigger, setTrigger] = useState(0);

  // STEP 1: Wait for auth to load
  useEffect(() => {
    if (loading) return;
    if (!session) return setStatus('login');

    // If we have a session but no state yet
    if (demo || session.isDemo) {
      loadDemo();
      // Don't set status yet — wait for useEffect on app.state
    } else {
      setStatus('loading');
      getAppState(app.filters, session)
        .then(state => {
          setState(state);
          setStatus('ready');
        })
        .catch(() => setStatus('login'));
    }
  }, [session, loading, demo]);

  // STEP 2: When app.state updates, check if we should transition to ready
  useEffect(() => {
    if (app.state?.authorized && (status === 'init' || status === 'login')) {
      setStatus('ready');
    }
  }, [app.state, status]);

  // Loading spinner
  if (loading || status === 'init' || status === 'loading') {
    return (
      <div className="boot">
        <div className="boot-panel">
          <div className="brand-mark">RN</div>
          <strong>Dashboard Finance RUN</strong>
          <span>Menghubungkan dashboard...</span>
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
