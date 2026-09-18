import React, { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';
import './styles/redesign.css';
import { notify } from './components/ui/Toast';
import { humanizeError } from './utils/errorMessage';
import { logError } from './api/auditLog';

// Global error catching — prevents blank screen in production
window.addEventListener('error', (e) => {
  const root = document.getElementById('app');
  if (root && e.error) {
    logError({ message: e.error.message, stack: e.error.stack, source: 'window.onerror' });
    root.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#000000;color:#F9F9F9;font-family:monospace;padding:2rem;">
        <div style="background:#333333;border:1px solid #646464;border-radius:16px;padding:2rem;max-width:600px;">
          <h2 style="color:#F16001;margin-bottom:8px;">⚠️ Aplikasi berhenti tak terduga</h2>
          <p style="color:#A7A7A7;font-size:14px;">Halaman gagal dijalankan. Klik Refresh untuk memuat ulang; kalau tetap muncul, kirim pesan teknis di bawah ini ke tim IT.</p>
          <p style="color:#F9F9F9;font-size:13px;margin-top:8px;">${e.error.message}</p>
          <pre style="background:#000000;padding:1rem;border-radius:8px;font-size:11px;color:#F16001;overflow:auto;max-height:150px;margin-top:12px;">${e.error.stack?.slice(0,500) || ''}</pre>
          <button onclick="location.reload()" style="margin-top:12px;padding:8px 20px;background:#E85002;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;">Refresh</button>
        </div>
      </div>`;
  }
});

// Promise yang gagal biasanya cuma satu request yang error, bukan aplikasi
// rusak — dulu seluruh DOM ditimpa layar crash berbahasa Inggris. Sekarang
// cukup toast dengan keterangan yang bisa dibaca user, app tetap jalan.
window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled rejection:', e.reason);
  logError({ message: e.reason?.message || String(e.reason), stack: e.reason?.stack, source: 'unhandledrejection' });
  notify.error(humanizeError(e.reason));
});

ReactDOM.createRoot(document.getElementById('app')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
