import { useCallback, useEffect, useRef, useState } from 'react';

const IDLE_LIMIT_MS = 30 * 60 * 1000; // 30 minutes of no activity
const WARNING_MS = 60 * 1000; // show a "still there?" warning 60s before logout

// Auto-logout after prolonged inactivity — standard baseline for a finance
// tool. Tracks real user input (mouse/keyboard/touch/scroll), not just tab
// focus, so a background tab doesn't get logged out early nor a genuinely
// idle-but-focused tab stay open forever.
export function useIdleLogout(onLogout, enabled) {
  const [warning, setWarning] = useState(false);
  const timerRef = useRef(null);
  const warnRef = useRef(null);

  const reset = useCallback(() => {
    setWarning(false);
    clearTimeout(timerRef.current);
    clearTimeout(warnRef.current);
    if (!enabled) return;
    warnRef.current = setTimeout(() => setWarning(true), IDLE_LIMIT_MS - WARNING_MS);
    timerRef.current = setTimeout(() => onLogout(), IDLE_LIMIT_MS);
  }, [enabled, onLogout]);

  useEffect(() => {
    if (!enabled) { clearTimeout(timerRef.current); clearTimeout(warnRef.current); return; }
    const events = ['mousemove', 'keydown', 'mousedown', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      events.forEach(e => window.removeEventListener(e, reset));
      clearTimeout(timerRef.current);
      clearTimeout(warnRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { warning, stayLoggedIn: reset };
}
