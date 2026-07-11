import { useState, createContext, useContext, useCallback, useEffect } from 'react';

const AuthContext = createContext(null);

// Demo hardcoded credentials — all logins use demo mode since no live API
const DEMO_CREDENTIALS = [
  { email: 'admin@runfinance.com', password: 'superadmin123', name: 'Super Admin', role: 'superadmin', canApprove: true, canManageUsers: true },
  { email: 'finance@runfinance.com', password: 'finance123', name: 'Admin Finance', role: 'finance', canApprove: true, canManageUsers: true },
  { email: 'owner@runfinance.com', password: 'owner123', name: 'Company Owner', role: 'owner', canApprove: true, canManageUsers: false },
  { email: 'pic@runfinance.com', password: 'pic123', name: 'PIC Brand', role: 'pic_brand', canApprove: false, canManageUsers: false },
];

const STORAGE_KEY_OVERRIDES = 'financeRunCredentialsOverrides';
const STORAGE_KEY_USERS = 'financeRunUsers';
const STORAGE_KEY_EMAIL = 'financeRunEmail';
const STORAGE_KEY_PASSWORD = 'financeRunPassword';

// ponytail: base64 obfuscation, not encryption — prevents casual shoulder-surfing in devtools
const encodePassword = (pw) => btoa(unescape(encodeURIComponent(pw)));
const decodePassword = (encoded) => {
  try { return decodeURIComponent(escape(atob(encoded))); } catch { return ''; }
};

const isProduction = typeof window !== 'undefined' && !window.location.hostname.match(/^(localhost|127\.0\.0\.1)$/);

export function getDemoCredentials() {
  try {
    const overridesRaw = localStorage.getItem(STORAGE_KEY_OVERRIDES);
    const overrides = overridesRaw ? JSON.parse(overridesRaw) : {};
    return DEMO_CREDENTIALS.map(c => {
      if (overrides[c.email]) {
        return { ...c, password: overrides[c.email], isHardcoded: true };
      }
      return { ...c, isHardcoded: true };
    });
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
  if (idx >= 0) {
    users[idx].password = newPassword;
    saveStoredUsers(users);
  }
  const isDemoUser = DEMO_CREDENTIALS.some(c => c.email === email);
  if (isDemoUser) {
    saveDemoCredentialOverride(email, newPassword);
  }
}

export function addUser(user) {
  const users = getStoredUsers();
  users.push({ ...user, createdAt: new Date().toISOString() });
  saveStoredUsers(users);
}

export function removeUser(email) {
  const users = getStoredUsers().filter(u => u.email !== email);
  saveStoredUsers(users);
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [demo, setDemo] = useState(false);
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    const email = localStorage.getItem(STORAGE_KEY_EMAIL);
    const encoded = localStorage.getItem(STORAGE_KEY_PASSWORD);
    if (email && encoded) {
      const password = decodePassword(encoded);
      const stored = getStoredUsers();
      const allUsers = [...DEMO_CREDENTIALS, ...stored];
      const match = allUsers.find(c => c.email === email && c.password === password);
      if (match) {
        const demoMode = !isProduction;
        setSession({
          email: match.email,
          name: match.name,
          role: match.role,
          permissions: { canApprove: match.canApprove || match.role === 'superadmin', canManageUsers: match.canManageUsers || match.role === 'superadmin' },
          isDemo: demoMode,
        });
        setDemo(demoMode);
      } else {
        setSession(null);
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback((email, password) => {
    const stored = getStoredUsers();
    const allUsers = [...DEMO_CREDENTIALS, ...stored];
    const match = allUsers.find(c => c.email === email && c.password === password);
    if (match) {
      const demoMode = !isProduction;
      localStorage.setItem(STORAGE_KEY_EMAIL, email);
      localStorage.setItem(STORAGE_KEY_PASSWORD, encodePassword(password));
      setSession({
        email: match.email,
        name: match.name,
        role: match.role,
        permissions: { canApprove: match.canApprove || match.role === 'superadmin', canManageUsers: match.canManageUsers || match.role === 'superadmin' },
        isDemo: demoMode,
      });
      setDemo(demoMode);
      setLoginError('');
    } else {
      setLoginError('Email atau password salah.');
    }
  }, []);

  const startDemo = useCallback(() => {
    if (isProduction) return;
    setSession({
      email: 'demo@finance.local',
      name: 'Demo Finance',
      role: 'finance',
      permissions: { canApprove: true, canManageUsers: true },
      isDemo: true,
    });
    setDemo(true);
    setLoginError('');
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_EMAIL);
    localStorage.removeItem(STORAGE_KEY_PASSWORD);
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

