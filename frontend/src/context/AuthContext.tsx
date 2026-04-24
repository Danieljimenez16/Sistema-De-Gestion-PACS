import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AuthUser, LoginCredentials } from '../types';
import { authService } from '../services';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (creds: LoginCredentials) => Promise<{ mustChangePassword: boolean }>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isManager: boolean;
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

const getRoleName = (role: RoleLike | undefined): string =>
  typeof role === 'string' ? role : (role?.name ?? '');

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

/**
 * Decode a JWT payload without verifying the signature.
 * The backend verifies on every API request — this is only used as a
 * fallback to read claims (role, email, etc.) when /auth/me is unreachable.
 */
const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - b64.length % 4) % 4);
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch { return null; }
};

/** Build a minimal AuthUser from a decoded JWT payload. */
const userFromToken = (payload: Record<string, unknown>, token: string): AuthUser => {
  const roleName = (payload.role as string | undefined) ?? '';
  const roleId   = payload.roleId as string | undefined;
  return {
    id: payload.sub as string ?? '',
    email: payload.email as string ?? '',
    full_name: payload.fullName as string ?? '',
    role_id: roleId,
    role: roleName ? { id: roleId ?? '', name: roleName, created_at: '' } : undefined,
    is_active: true,
    must_change_password: (payload.mustChangePassword as boolean) ?? false,
    mustChangePassword:   (payload.mustChangePassword as boolean) ?? false,
    created_at: '',
    updated_at: '',
    token,
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }

    // Immediately seed user state from the token so `isAdmin` is available
    // before the /me round-trip completes (prevents flicker / wrong redirects).
    const tokenPayload = decodeJwtPayload(token);
    if (tokenPayload) {
      // Check token expiry
      const exp = tokenPayload.exp as number | undefined;
      if (exp && exp * 1000 < Date.now()) {
        localStorage.removeItem('token');
        setLoading(false);
        return;
      }
      setUser(userFromToken(tokenPayload, token));
    }

    try {
      const res = await authService.me();
      if (res.success) setUser(normalizeAuthUser(res.data, token));
    } catch {
      // /me failed (network, 404, etc.) but the token may still be valid.
      // Keep the token-based user state — the backend verifies on every request.
      if (!tokenPayload) {
        // Token couldn't be decoded at all — clear it.
        localStorage.removeItem('token');
        setUser(null);
      }
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

  const roleName = getRoleName(user?.role).toLowerCase().trim();
  const isAdmin   = roleName === 'admin' || roleName === 'administrador';
  const isManager = isAdmin || roleName === 'manager' || roleName === 'gestor';

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isManager, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
