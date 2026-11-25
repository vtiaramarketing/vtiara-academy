import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { backend } from './db';
import type { Profile, RoleKey, SessionUser } from './types';

interface AuthCtx {
  user: SessionUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  hasRole: (...roles: RoleKey[]) => boolean;
  isAdmin: boolean;
  isStaff: boolean;
}
const Ctx = createContext<AuthCtx>(null as unknown as AuthCtx);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const u = await backend.auth.getUser();
      if (!u) { setUser(null); return; }
      const [roles, profiles] = await Promise.all([
        backend.select<{ role_key: RoleKey }>('user_roles', { eq: { user_id: u.id } }),
        backend.select<Profile>('profiles', { eq: { id: u.id } }),
      ]);
      setUser({ id: u.id, email: u.email, roles: roles.map((r) => r.role_key), profile: profiles[0] ?? null });
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); return backend.auth.onChange(() => { refresh(); }); }, [refresh]);

  const value = useMemo<AuthCtx>(() => {
    const has = (...r: RoleKey[]) => !!user?.roles.some((x) => r.includes(x));
    return {
      user, loading, refresh, hasRole: has,
      isAdmin: has('super_admin', 'academy_admin'),
      isStaff: has('super_admin', 'academy_admin', 'trainer', 'assessor'),
    };
  }, [user, loading, refresh]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
