import React, { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';

// Global error catching — prevents blank screen in production
window.addEventListener('error', (e) => {
  const root = document.getElementById('app');
  if (root && e.error) {
    root.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f172a;color:#f1f5f9;font-family:monospace;padding:2rem;">
        <div style="background:#1e293b;border:1px solid #334155;border-radius:16px;padding:2rem;max-width:600px;">
          <h2 style="color:#f97316;margin-bottom:8px;">⚠️ Global Error</h2>
          <p style="color:#94a3b8;font-size:14px;">${e.error.message}</p>
          <pre style="background:#0f172a;padding:1rem;border-radius:8px;font-size:11px;color:#fb7185;overflow:auto;max-height:150px;margin-top:12px;">${e.error.stack?.slice(0,500) || ''}</pre>
          <button onclick="location.reload()" style="margin-top:12px;padding:8px 20px;background:#2563eb;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;">Refresh</button>
        </div>
      </div>`;
  }
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled rejection:', e.reason);
  const root = document.getElementById('app');
  if (root && e.reason) {
    root.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f172a;color:#f1f5f9;font-family:monospace;padding:2rem;">
        <div style="background:#1e293b;border:1px solid #334155;border-radius:16px;padding:2rem;max-width:600px;">
          <h2 style="color:#f97316;margin-bottom:8px;">⚠️ Unhandled Promise</h2>
          <p style="color:#94a3b8;font-size:14px;">${String(e.reason?.message || e.reason || 'Unknown')}</p>
          <pre style="background:#0f172a;padding:1rem;border-radius:8px;font-size:11px;color:#fb7185;overflow:auto;max-height:150px;margin-top:12px;">${(e.reason?.stack || '').slice(0,500)}</pre>
          <button onclick="location.reload()" style="margin-top:12px;padding:8px 20px;background:#2563eb;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;">Refresh</button>
        </div>
      </div>`;
  }
});

ReactDOM.createRoot(document.getElementById('app')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
