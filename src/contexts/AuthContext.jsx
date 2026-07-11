import { useState, createContext, useContext, useCallback, useEffect } from 'react';

const AuthContext = createContext(null);

// Demo hardcoded credentials — all logins use demo mode since no live API
const DEMO_CREDENTIALS = [
  { email: 'admin@runfinance.com', password: 'superadmin123', name: 'Super Admin', role: 'superadmin', canApprove: true, canManageUsers: true },
  { email: 'finance@runfinance.com', password: 'finance123', name: 'Admin Finance', role: 'finance', canApprove: true, canManageUsers: true },
  { email: 'owner@runfinance.com', password: 'owner123', name: 'Company Owner', role: 'owner', canApprove: true, canManageUsers: false },
  { email: 'pic@runfinance.com', password: 'pic123', name: 'PIC Brand', role: 'pic_brand', canApprove: false, canManageUsers: false },
];

const STORAGE_KEY_EMAIL = 'financeRunEmail';
const STORAGE_KEY_PASSWORD = 'financeRunPassword';
const STORAGE_KEY_USERS = 'financeRunUsers';

function loadLegacySession() {
  try {
    const oldEmail = localStorage.getItem('financeJoyboardEmail');
    const oldCode = localStorage.getItem('financeJoyboardLoginCode');
    if (oldEmail && !localStorage.getItem(STORAGE_KEY_EMAIL)) {
      localStorage.setItem(STORAGE_KEY_EMAIL, oldEmail);
      localStorage.setItem(STORAGE_KEY_PASSWORD, oldCode || '');
      localStorage.removeItem('financeJoyboardEmail');
      localStorage.removeItem('financeJoyboardLoginCode');
    }
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
  const dc = DEMO_CREDENTIALS.find(c => c.email === email);
  if (dc) dc.password = newPassword;
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
    loadLegacySession();
    const email = localStorage.getItem(STORAGE_KEY_EMAIL);
    const password = localStorage.getItem(STORAGE_KEY_PASSWORD);
    if (email && password) {
      const stored = getStoredUsers();
      const allUsers = [...DEMO_CREDENTIALS, ...stored];
      const match = allUsers.find(c => c.email === email && c.password === password);
      if (match) {
        setSession({
          email: match.email,
          name: match.name,
          role: match.role,
          permissions: { canApprove: match.canApprove || match.role === 'superadmin', canManageUsers: match.canManageUsers || match.role === 'superadmin' },
          isDemo: true, // ALL logins use demo mode — no live API
        });
        setDemo(true);
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
      localStorage.setItem(STORAGE_KEY_EMAIL, email);
      localStorage.setItem(STORAGE_KEY_PASSWORD, password);
      setSession({
        email: match.email,
        name: match.name,
        role: match.role,
        permissions: { canApprove: match.canApprove || match.role === 'superadmin', canManageUsers: match.canManageUsers || match.role === 'superadmin' },
        isDemo: true, // ALL logins use demo mode — no live API
      });
      setDemo(true);
      setLoginError('');
    } else {
      setLoginError('Email atau password salah.');
    }
  }, []);

  const startDemo = useCallback(() => {
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
    <AuthContext.Provider value={{ session, loading, demo, loginError, login, startDemo, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

