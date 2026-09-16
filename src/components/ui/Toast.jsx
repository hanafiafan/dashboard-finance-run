import { useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

// Pub/sub sederhana di level modul supaya notify() bisa dipanggil dari mana saja
// (termasuk di luar komponen React) tanpa perlu context/provider tambahan.
let listeners = [];
let seq = 0;

function push(type, text, ttl) {
  // Pesan berformat "Judul\nKeterangan" (lihat utils/errorMessage.js).
  const [title, ...rest] = String(text ?? '').split('\n');
  const toast = { id: ++seq, type, title, detail: rest.join(' ').trim(), ttl };
  listeners.forEach(fn => fn(toast));
  return toast.id;
}

export const notify = {
  success: text => push('success', text, 4000),
  info: text => push('info', text, 5000),
  warning: text => push('warning', text, 7000),
  // Error tidak hilang sendiri — user harus sempat membaca keterangannya.
  error: text => push('error', text, 0),
};

const ICONS = { success: CheckCircle2, info: Info, warning: AlertTriangle, error: XCircle };
const TITLES = { success: 'Berhasil', info: 'Info', warning: 'Perhatian', error: 'Gagal' };

export function ToastHost() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const onToast = t => {
      setToasts(list => [...list, t]);
      if (t.ttl) setTimeout(() => setToasts(list => list.filter(x => x.id !== t.id)), t.ttl);
    };
    listeners.push(onToast);
    return () => { listeners = listeners.filter(fn => fn !== onToast); };
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="toast-host" role="status" aria-live="polite">
      {toasts.map(t => {
        const Icon = ICONS[t.type];
        return (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <Icon size={18} className="toast-icon" />
            <div className="toast-text">
              <strong>{t.title || TITLES[t.type]}</strong>
              {t.detail && <p>{t.detail}</p>}
            </div>
            <button
              className="toast-close"
              aria-label="Tutup notifikasi"
              onClick={() => setToasts(list => list.filter(x => x.id !== t.id))}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
