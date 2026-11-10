import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, tokenStore } from './api';

export interface Admin { sub: string; name: string; role: 'super' | 'moderator' | 'support' }
const Ctx = createContext<{ admin: Admin | null; ready: boolean; login: (email: string, pw: string) => Promise<void>; logout: () => void } | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const out = () => setAdmin(null);
    window.addEventListener('lr-logout', out);
    if (tokenStore.get()) api<Admin>('/api/admin/me').then(setAdmin).catch(() => setAdmin(null)).finally(() => setReady(true));
    else setReady(true);
    return () => window.removeEventListener('lr-logout', out);
  }, []);
  const login = async (email: string, password: string) => {
    const r = await api<{ token: string; admin: { id: string; name: string; role: Admin['role'] } }>('/api/admin/login', { body: { email, password } });
    tokenStore.set(r.token);
    setAdmin({ sub: r.admin.id, name: r.admin.name, role: r.admin.role });
  };
  const logout = () => { tokenStore.set(null); setAdmin(null); };
  return <Ctx.Provider value={{ admin, ready, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth outside AuthProvider');
  return c;
}
/** Support staff can read everything but only moderators and super admins can change settings or chips. */
export const useCanEdit = () => { const { admin } = useAuth(); return admin?.role === 'super' || admin?.role === 'moderator'; };
