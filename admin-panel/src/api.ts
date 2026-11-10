/** Small fetch wrapper for the admin API. The token lives in localStorage on this browser only. */
const BASE = import.meta.env.VITE_API_URL ?? '';
const KEY = 'lr-admin-token';

export const tokenStore = {
  get: () => { try { return localStorage.getItem(KEY); } catch { return null; } },
  set: (t: string | null) => { try { if (t) localStorage.setItem(KEY, t); else localStorage.removeItem(KEY); } catch { /* private mode */ } },
};

export class ApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export async function api<T = any>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = tokenStore.get();
  const res = await fetch(BASE + path, {
    method: init.method ?? (init.body ? 'POST' : 'GET'),
    headers: { ...(init.body !== undefined ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== '/api/admin/login') { tokenStore.set(null); window.dispatchEvent(new Event('lr-logout')); }
  if (!res.ok) throw new ApiError(json.error ?? 'Request failed', res.status);
  return json as T;
}

export const fmt = (n: number | string | null | undefined) => Number(n ?? 0).toLocaleString('en-IN');
export const signed = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '') + fmt(Math.abs(n));
export function ago(d: string | number | Date) {
  const s = Math.max(0, (Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 172800) return 'Yesterday';
  return `${Math.floor(s / 86400)} days ago`;
}
export const time = (d: string | Date) => new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
export const initials = (name: string) => name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
export const MODE_NAMES: Record<string, string> = { points: 'Points', pool: 'Pool 101', deals: 'Deals' };
