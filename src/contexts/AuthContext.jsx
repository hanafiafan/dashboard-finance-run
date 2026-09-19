import { useState, createContext, useContext, useCallback, useEffect } from 'react';
import { supabase } from '../api/supabaseClient';

const AuthContext = createContext(null);

// Demo hardcoded credentials — used in local dev only, never in production
// (production auth is real Supabase Auth, see login() below).
const DEMO_CREDENTIALS = [
  { email: 'admin@runfinance.com', password: 'superadmin123', name: 'Super Admin', role: 'superadmin', canApprove: true, canManageUsers: true },
  { email: 'finance@runfinance.com', password: 'finance123', name: 'Admin Finance', role: 'finance', canApprove: true, canManageUsers: true },
  { email: 'owner@runfinance.com', password: 'owner123', name: 'Company Owner', role: 'owner', canApprove: false, canManageUsers: false },
  { email: 'pic@runfinance.com', password: 'pic123', name: 'PIC Brand', role: 'pic_brand', canApprove: false, canManageUsers: false },
];

const STORAGE_KEY_OVERRIDES = 'financeRunCredentialsOverrides';
const STORAGE_KEY_USERS = 'financeRunUsers';

const isProduction = typeof window !== 'undefined' && !window.location.hostname.match(/^(localhost|127\.0\.0\.1)$/);

function buildSession(profile, demoMode, accessToken) {
  const isSuperadmin = profile.role === 'superadmin';
  return {
    email: profile.email,
    name: profile.name,
    role: profile.role,
    permissions: {
      canApprove: profile.canApprove ?? (isSuperadmin || profile.role === 'finance'),
      canManageUsers: profile.canManageUsers ?? (isSuperadmin || profile.role === 'finance'),
      canImport: isSuperadmin || profile.role === 'finance',
    },
    isDemo: demoMode,
    accessToken,
  };
}

async function loadProfile(userId) {
  return supabase.from('profiles').select('*').eq('id', userId).single();
}

// Dev-only helpers backing the local demo credential list — never used in production.
export function getDemoCredentials() {
  try {
    const overridesRaw = localStorage.getItem(STORAGE_KEY_OVERRIDES);
    const overrides = overridesRaw ? JSON.parse(overridesRaw) : {};
    return DEMO_CREDENTIALS.map(c => ({ ...c, password: overrides[c.email] || c.password, isHardcoded: true }));
  } catch {
    return DEMO_CREDENTIALS.map(c => ({ ...c, isHardcoded: true }));
  }
}

function saveDemoCredentialOverride(email, password) {
  try {
    const overridesRaw = localStorage.getItem(STORAGE_KEY_OVERRIDES);
    const overrides = overridesRaw ? JSON.parse(overridesRaw) : {};
    overrides[email] = password;
    localStorage.setItem(STORAGE_KEY_OVERRIDES, JSON.stringify(overrides));
  } catch {}
}

export function getStoredUsers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export function saveStoredUsers(users) {
  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
}

export function resetUserPassword(email, newPassword) {
  const users = getStoredUsers();
  const idx = users.findIndex(u => u.email === email);
  if (idx >= 0) { users[idx].password = newPassword; saveStoredUsers(users); }
  if (DEMO_CREDENTIALS.some(c => c.email === email)) saveDemoCredentialOverride(email, newPassword);
}

export function addUser(user) {
  const users = getStoredUsers();
  users.push({ ...user, createdAt: new Date().toISOString() });
  saveStoredUsers(users);
}

export function removeUser(email) {
  saveStoredUsers(getStoredUsers().filter(u => u.email !== email));
}

export function setUserActive(email, active) {
  const users = getStoredUsers();
  const idx = users.findIndex(u => u.email === email);
  if (idx >= 0) { users[idx].active = active; saveStoredUsers(users); }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [demo, setDemo] = useState(false);
  const [loginError, setLoginError] = useState('');
  // Set only when a password sign-in succeeded but the account has TOTP
  // enrolled and needs the second factor before we finish loading the
  // profile/session — see verifyMfaCode() below.
  const [mfaPending, setMfaPending] = useState(null);
  // Set when the user arrives via a Supabase password-recovery link — Supabase
  // establishes a real (but recovery-scoped) session for the link's target
  // account, which we intentionally do NOT treat as a normal login until
  // completePasswordReset() below confirms a new password.
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    if (!isProduction) { setLoading(false); return; }
    // Live: restore whatever Supabase Auth session already exists (it persists
    // its own token in localStorage — we just resolve the role from `profiles`).
    supabase.auth.getSession().then(async ({ data }) => {
      const user = data?.session?.user;
      if (!user) { setLoading(false); return; }
      const { data: profile, error } = await loadProfile(user.id);
      if (profile?.active) {
        setSession(buildSession(profile, false, data.session.access_token));
        setDemo(false);
      } else if (!error) {
        // Query succeeded and genuinely found no active profile — sign out for real.
        await supabase.auth.signOut();
      }
      // On a query error (network blip, transient outage) we deliberately do NOT
      // sign out — the underlying Supabase session is left intact and this check
      // simply retries next time the app loads, instead of silently logging out
      // a valid user because one request happened to fail.
      setLoading(false);
    });

    // Keep the cached access token fresh — without this, api/manage-user.js calls
    // (create/reset/delete user) start failing with a confusing "invalid session"
    // error about an hour into a perfectly valid browsing session, since
    // supabase-js auto-refreshes the underlying token but we never picked up
    // the new value.
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'TOKEN_REFRESHED' && newSession) {
        setSession(prev => (prev ? { ...prev, accessToken: newSession.access_token } : prev));
      }
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Shared by the direct-login success path and the post-MFA-verify path —
  // loads the profile row and finishes establishing the app session.
  const finishLogin = useCallback(async (accessToken, userId) => {
    const { data: profile, error: profileErr } = await loadProfile(userId);
    if (!profile?.active) {
      await supabase.auth.signOut();
      setLoginError(profileErr ? 'Gagal memuat profil, coba lagi.' : 'Akun tidak aktif atau tidak ditemukan.');
      return;
    }
    setSession(buildSession(profile, false, accessToken));
    setDemo(false);
    setLoginError('');
    setMfaPending(null);
  }, []);

  const login = useCallback(async (email, password) => {
    if (isProduction) {
      // Brute-force throttle — fails open (never blocks login) if the RPC
      // isn't there yet, e.g. migration 0022 not applied.
      try {
        const { data: locked } = await supabase.rpc('check_login_locked', { p_email: email });
        if (locked) {
          setLoginError('Terlalu banyak percobaan gagal. Coba lagi dalam 15 menit.');
          return;
        }
      } catch { /* RPC missing or unreachable — don't block login on it */ }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      try { await supabase.rpc('record_login_attempt', { p_email: email, p_success: !!(data?.session) }); } catch { /* best-effort */ }
      if (error || !data?.session) {
        setLoginError('Email atau password salah.');
        return;
      }
      // Password was correct — check if this account also has TOTP enrolled
      // and the session still needs a second factor before it's fully trusted.
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal && aal.nextLevel === 'aal2' && aal.nextLevel !== aal.currentLevel) {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const factor = factors?.totp?.find(f => f.status === 'verified');
        if (factor) {
          const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId: factor.id });
          if (challengeErr) { setLoginError('Gagal memulai verifikasi 2FA, coba lagi.'); return; }
          setMfaPending({ factorId: factor.id, challengeId: challenge.id, userId: data.session.user.id, accessToken: data.session.access_token });
          setLoginError('');
          return;
        }
      }
      await finishLogin(data.session.access_token, data.session.user.id);
      return;
    }
    // Local dev: check hardcoded + localStorage users
    const stored = getStoredUsers();
    const allUsers = [...getDemoCredentials(), ...stored];
    const match = allUsers.find(c => c.email === email && c.password === password);
    if (match) {
      setSession(buildSession(match, true));
      setDemo(true);
      setLoginError('');
    } else {
      setLoginError('Email atau password salah.');
    }
  }, []);

  const verifyMfaCode = useCallback(async (code) => {
    if (!mfaPending) return;
    const { data, error } = await supabase.auth.mfa.verify({ factorId: mfaPending.factorId, challengeId: mfaPending.challengeId, code });
    if (error || !data) {
      setLoginError('Kode salah atau sudah kedaluwarsa, coba lagi.');
      return;
    }
    await finishLogin(data.access_token, mfaPending.userId);
  }, [mfaPending, finishLogin]);

  const cancelMfa = useCallback(async () => {
    await supabase.auth.signOut();
    setMfaPending(null);
    setLoginError('');
  }, []);

  // Always resolves without revealing whether the email actually has an
  // account — GoTrue itself behaves this way to avoid email enumeration.
  const requestPasswordReset = useCallback(async (email) => {
    if (!isProduction) return;
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
  }, []);

  const completePasswordReset = useCallback(async (newPassword) => {
    const { data } = await supabase.auth.getSession();
    const recoverySession = data?.session;
    if (!recoverySession) return { error: 'Sesi reset kedaluwarsa, minta link reset baru.' };
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: error.message };
    setPasswordRecovery(false);
    await finishLogin(recoverySession.access_token, recoverySession.user.id);
    return {};
  }, [finishLogin]);

  const startDemo = useCallback(() => {
    if (isProduction) return;
    setSession(buildSession({ email: 'demo@finance.local', name: 'Demo Finance', role: 'finance', canApprove: true, canManageUsers: true }, true));
    setDemo(true);
    setLoginError('');
  }, []);

  const logout = useCallback(() => {
    if (isProduction) supabase.auth.signOut();
    setSession(null);
    setDemo(false);
    setLoginError('');
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading, demo, loginError, login, startDemo, logout, isProduction, mfaPending, verifyMfaCode, cancelMfa, passwordRecovery, requestPasswordReset, completePasswordReset }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
