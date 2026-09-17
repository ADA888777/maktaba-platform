import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, ApiError } from '../lib/api';
import type { AdminUser, Permission } from '../lib/types';

interface AuthState {
  user: AdminUser | null;
  permissions: Permission[];
  checking: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  can: (p: Permission) => boolean;
}

const Ctx = createContext<AuthState | null>(null);
type MeResponse = { user: AdminUser; permissions: Permission[] };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [checking, setChecking] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await api.get<MeResponse>('/auth/me');
      setUser(me.user);
      setPermissions(me.permissions);
    } catch (e) {
      if (!(e instanceof ApiError) || e.status === 401) {
        setUser(null);
        setPermissions([]);
      }
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = async (username: string, password: string) => {
    const me = await api.post<MeResponse>('/auth/login', { username, password });
    setUser(me.user);
    setPermissions(me.permissions);
  };

  const logout = async () => {
    await api.post('/auth/logout').catch(() => undefined);
    setUser(null);
    setPermissions([]);
  };

  return (
    <Ctx.Provider value={{ user, permissions, checking, login, logout, refresh, can: (p) => permissions.includes(p) }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('AuthProvider مفقود');
  return ctx;
}
