import { useState, createContext, useContext, useCallback, useEffect } from 'react';
import { supabase } from '../api/supabaseClient';

const AuthContext = createContext(null);

// Demo hardcoded credentials — used in local dev only, never in production
// (production auth is real Supabase Auth, see login() below).
const DEMO_CREDENTIALS = [
  { email: 'admin@runfinance.com', password: 'superadmin123', name: 'Super Admin', role: 'superadmin', canApprove: true, canManageUsers: true },
  { email: 'finance@runfinance.com', password: 'finance123', name: 'Admin Finance', role: 'finance', canApprove: true, canManageUsers: true },
  { email: 'owner@runfinance.com', password: 'owner123', name: 'Company Owner', role: 'owner', canApprove: true, canManageUsers: false },
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
      canApprove: profile.canApprove ?? profile.role !== 'pic_brand',
      canManageUsers: profile.canManageUsers ?? (isSuperadmin || profile.role === 'finance'),
      canImport: isSuperadmin || profile.role === 'finance',
    },
    isDemo: demoMode,
    accessToken,
  };
}

async function loadProfile(userId) {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
  return data;
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

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [demo, setDemo] = useState(false);
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    if (!isProduction) { setLoading(false); return; }
    // Live: restore whatever Supabase Auth session already exists (it persists
    // its own token in localStorage — we just resolve the role from `profiles`).
    supabase.auth.getSession().then(async ({ data }) => {
      const user = data?.session?.user;
      if (!user) { setLoading(false); return; }
      const profile = await loadProfile(user.id);
      if (profile?.active) {
        setSession(buildSession(profile, false, data.session.access_token));
        setDemo(false);
      } else {
        await supabase.auth.signOut();
      }
      setLoading(false);
    });
  }, []);

  const login = useCallback(async (email, password) => {
    if (isProduction) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data?.session) {
        setLoginError('Email atau password salah.');
        return;
      }
      const profile = await loadProfile(data.session.user.id);
      if (!profile?.active) {
        await supabase.auth.signOut();
        setLoginError('Akun tidak aktif atau tidak ditemukan.');
        return;
      }
      setSession(buildSession(profile, false, data.session.access_token));
      setDemo(false);
      setLoginError('');
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
    <AuthContext.Provider value={{ session, loading, demo, loginError, login, startDemo, logout, isProduction }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
