// ============================================
// TOOLFLOW — Authentication Module
// ============================================

const AUTH_KEY = 'tf_auth';
const REMEMBER_KEY = 'tf_remember';

// Default admin credentials
const ADMIN_USERS = [
  { username: 'admin', password: 'admin123', name: 'Admin', role: 'Manager', initials: 'AD' },
  { username: 'cashier', password: 'cash123', name: 'Cashier', role: 'Cashier', initials: 'CA' },
];

export function login(username, password, remember = false) {
  const user = ADMIN_USERS.find(u => u.username === username && u.password === password);
  if (!user) return { error: true };
  
  const session = {
    username: user.username,
    name: user.name,
    role: user.role,
    initials: user.initials,
    loggedInAt: new Date().toISOString(),
  };
  
  sessionStorage.setItem(AUTH_KEY, JSON.stringify(session));
  if (remember) {
    localStorage.setItem(REMEMBER_KEY, JSON.stringify({ username: user.username, name: user.name, role: user.role, initials: user.initials }));
  } else {
    localStorage.removeItem(REMEMBER_KEY);
  }
  
  return { ok: true, user: session };
}

export function logout() {
  sessionStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(REMEMBER_KEY);
}

export function isAuthenticated() {
  if (sessionStorage.getItem(AUTH_KEY)) return true;
  // Auto-login from "remember me"
  const saved = localStorage.getItem(REMEMBER_KEY);
  if (saved) {
    try {
      const data = JSON.parse(saved);
      // Find matching user to verify still valid
      const user = ADMIN_USERS.find(u => u.username === data.username);
      if (user) {
        const session = {
          username: user.username,
          name: user.name,
          role: user.role,
          initials: user.initials,
          loggedInAt: new Date().toISOString(),
        };
        sessionStorage.setItem(AUTH_KEY, JSON.stringify(session));
        return true;
      }
    } catch { /* ignore */ }
  }
  return false;
}

export function getCurrentUser() {
  try {
    return JSON.parse(sessionStorage.getItem(AUTH_KEY));
  } catch {
    return null;
  }
}
