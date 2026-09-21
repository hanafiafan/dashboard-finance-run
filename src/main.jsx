import React, { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';
import './styles/gogo.css';
import { notify } from './components/ui/Toast';
import { humanizeError } from './utils/errorMessage';
import { logError } from './api/auditLog';

// Global error catching — prevents blank screen in production
window.addEventListener('error', (e) => {
  const root = document.getElementById('app');
  if (root && e.error) {
    logError({ message: e.error.message, stack: e.error.stack, source: 'window.onerror' });
    root.innerHTML = `<main class="state-screen"><a class="state-brand" href="/">run<span>finance</span><i></i></a><div class="state-layout"><div class="state-art" aria-hidden="true"><div class="state-orbit"></div><strong>!</strong><span>KEEP YOUR FINANCES IN FOCUS</span></div><section class="state-content"><span class="overline">RUN FINANCE / PEMULIHAN WORKSPACE</span><h1>Workspace perlu dimuat ulang.</h1><p>Terjadi kendala saat menjalankan aplikasi. Coba muat ulang untuk melanjutkan pekerjaan Anda.</p><details class="state-details"><summary>Detail teknis</summary><pre></pre></details><div class="state-actions"><button class="btn primary" type="button">Muat ulang</button><a class="btn ghost" href="/">Kembali ke dashboard</a></div></section></div></main>`;
    root.querySelector('pre').textContent = e.error.message || 'Kesalahan tidak diketahui.';
    root.querySelector('button').addEventListener('click', () => window.location.reload());
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
