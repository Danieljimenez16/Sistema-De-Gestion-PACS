import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AuthUser, LoginCredentials } from '../types';
import { authService } from '../services';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (creds: LoginCredentials) => Promise<{ mustChangePassword: boolean }>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

type RoleLike = string | { id?: string; name?: string; created_at?: string };

type AuthPayload = Partial<Omit<AuthUser, 'role'>> & {
  sub?: string;
  fullName?: string;
  role?: RoleLike;
  roleId?: string;
};

type LoginResponseData = AuthPayload & {
  user?: AuthPayload;
};

const getRoleName = (role: RoleLike | undefined) =>
  typeof role === 'string' ? role : role?.name;

const normalizeAuthUser = (data: LoginResponseData, token: string): AuthUser => {
  const source = data.user ?? data;
  const role = source.role;
  const roleName = getRoleName(role);
  const roleId = source.roleId ?? source.role_id ?? (typeof role === 'object' ? role?.id : undefined);

  return {
    ...(source as AuthUser),
    id: source.id ?? source.sub ?? '',
    email: source.email ?? '',
    full_name: source.full_name ?? source.fullName ?? '',
    role_id: roleId,
    role: typeof role === 'object'
      ? role as AuthUser['role']
      : roleName
        ? { id: roleId ?? '', name: roleName, created_at: '' }
        : undefined,
    is_active: source.is_active ?? true,
    must_change_password: source.must_change_password ?? source.mustChangePassword ?? false,
    mustChangePassword: source.mustChangePassword ?? source.must_change_password ?? false,
    token,
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    try {
      const res = await authService.me();
      if (res.success) setUser(normalizeAuthUser(res.data, token));
    } catch {
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const login = async (creds: LoginCredentials) => {
    const res = await authService.login(creds);
    if (res.success && res.data.token) {
      localStorage.setItem('token', res.data.token);
      const authUser = normalizeAuthUser(res.data as LoginResponseData, res.data.token);
      setUser(authUser);
      return { mustChangePassword: authUser.mustChangePassword ?? false };
    }
    return { mustChangePassword: false };
  };

  const logout = async () => {
    try { await authService.logout(); } catch { /* ignore */ }
    localStorage.removeItem('token');
    setUser(null);
  };

  const refreshUser = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await authService.me();
      if (res.success) setUser(normalizeAuthUser(res.data, token));
    } catch { /* ignore */ }
  };

  const roleName = getRoleName(user?.role)?.toLowerCase();
  const isAdmin = roleName === 'admin' || roleName === 'administrador';

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
