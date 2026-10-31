import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setUnauthorizedHandler, tokenStore } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(tokenStore.get()));

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    if (!tokenStore.get()) return undefined;
    let cancelled = false;
    api.me()
      .then((u) => { if (!cancelled) setUser(u); })
      .catch(() => { tokenStore.clear(); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const finish = useCallback((response) => {
    tokenStore.set(response.token);
    setUser(response.user);
    return response.user;
  }, []);

  const login = useCallback(async (email, password) => finish(await api.login(email, password)), [finish]);
  const register = useCallback(
    async (name, email, password) => finish(await api.register(name, email, password)), [finish]);
  const logout = useCallback(async () => {
    try { await api.logout(); } catch { /* token may already be invalid */ }
    tokenStore.clear();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
