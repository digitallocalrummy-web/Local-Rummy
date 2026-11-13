/**
 * Connection to the Local Rummy server: guest sign-in, wallet, game settings, banners and the live table.
 * Everything the screens show about chips, modes and games comes from here.
 */
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { io, type Socket } from 'socket.io-client';
import type { Card } from '../types';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
export const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

export type ModeId = 'points' | 'pool' | 'deals';
export interface ModeConfig { enabled: boolean; maxPlayers: number; entries: number[] }
export interface PublicConfig {
  modes: Record<ModeId, ModeConfig>;
  turnSeconds: number; quickChat: boolean; maintenance: boolean; minAppVersion: string; friendsTables?: boolean;
  bonus: { day1: number; multipliers: number[] };
}
export interface Me {
  id: string; code: string; name: string; color: string; chips: number; level: number;
  gamesPlayed: number; gamesWon: number; bonus: { available: boolean; day: number; amount: number };
  /** Emoji avatar; photoUrl (a server path) wins when set. */
  avatar: string | null; photoUrl: string | null;
  /** False until the player has finished the first-time profile screen. */
  profileDone: boolean;
}

/** Profile changes: a photo is a base64 JPEG (already resized). */
export interface ProfilePatch { name?: string; avatar?: string; photo?: string; removePhoto?: boolean; profileDone?: boolean }

/** Full URL for a photo path from the server, or null. */
export const photoUri = (path: string | null | undefined) => (path ? `${API_URL}${path}` : null);
/** An admin invitation to a code table. */
export interface Invite {
  id: number; code: string; title: string | null; mode: ModeId; players: number; entry: number; expiresAt: string;
  joined: { name: string; avatar: string | null; photo: string | null }[];
}
export interface Banner { id: number; title: string; subtitle: string; color: string; target: string }

export interface SeatView {
  idx: number; name: string; code: string; color: string; avatar?: string | null; photo?: string | null; isBot: boolean; cards: number;
  status: 'playing' | 'dropped' | 'invalid' | 'left'; lastThrown: Card | null; connected: boolean;
}
export interface SeatResult { idx: number; name: string; code: string; color: string; avatar?: string | null; photo?: string | null; kind: 'human' | 'bot'; points: number; chips: number; won: boolean; status: string; melds?: Card[][] }
export interface TableResult { winnerIdx: number | null; reason: string; seats: SeatResult[] }
export interface TableView {
  id: string; mode: ModeId; size: number; entry: number; phase: 'waiting' | 'playing' | 'ended'; you: number;
  /** Play with Friends: the code to share, and which seat is the host (-1 for public tables). */
  privateCode: string | null; host: number;
  invitees?: { name: string; avatar: string | null; photo: string | null; joined: boolean; declined: boolean }[];
  /** Admin code table: shown as an official table; autoStart false = the organiser presses Start. */
  official?: boolean; autoStart?: boolean;
  hand: Card[]; canDraw: boolean; canDiscard: boolean; seats: SeatView[];
  open: { card: Card; by: number } | null; recent: { card: Card; by: number }[]; deckCount: number;
  wild: Card | null; wildRank: string | null; turn: number; deadline: number | null; result: TableResult | null;
}
export type TableEvent =
  | { type: 'dealt' } | { type: 'wild'; card: Card } | { type: 'turn'; seat: number; deadline: number | null }
  | { type: 'drew'; seat: number; from: 'deck' | 'open'; card?: Card } | { type: 'discarded'; seat: number; card: Card }
  | { type: 'dropped'; seat: number; points: number } | { type: 'declared'; seat: number; valid: boolean; reason?: string }
  | { type: 'timeout'; seat: number } | { type: 'chat'; seat: number; text: string } | { type: 'ended'; result: TableResult };

type Ack = { ok: boolean; error?: string; [k: string]: unknown };
type Status = 'starting' | 'ready' | 'offline' | 'blocked';

interface SessionValue {
  status: Status;
  error: string | null;
  me: Me | null;
  config: PublicConfig | null;
  banners: Banner[];
  connected: boolean;
  table: TableView | null;
  /** Why we were sent away from a table (removed, cancelled, expired), until the next table. */
  notice: string | null;
  /** Open invitations from the admin, newest first. */
  invites: Invite[];
  joinInvite: (inv: Invite) => Promise<Ack>;
  declineInvite: (inv: Invite) => void;
  /** The last finished deal, kept for the result screen. */
  lastResult: { result: TableResult; table: TableView } | null;
  retry: () => void;
  refreshMe: () => Promise<void>;
  claimBonus: () => Promise<{ amount: number; chips: number }>;
  refill: () => Promise<{ amount: number; chips: number }>;
  rename: (name: string) => Promise<void>;
  /** Save name / emoji / photo. Resolves with an error message, or null when saved. */
  saveProfile: (patch: ProfilePatch) => Promise<string | null>;
  seat: (mode: ModeId, players: number, entry: number) => Promise<Ack>;
  createPrivate: (mode: ModeId, players: number, entry: number) => Promise<Ack>;
  joinPrivate: (code: string) => Promise<Ack>;
  startPrivate: (fillAi: boolean) => Promise<Ack>;
  draw: (from: 'deck' | 'open') => Promise<Ack>;
  discard: (cardId: string) => Promise<Ack>;
  declare: (cardId: string) => Promise<Ack>;
  drop: () => Promise<Ack>;
  leave: () => Promise<Ack>;
  chat: (text: string) => Promise<Ack>;
  onEvent: (fn: (e: TableEvent) => void) => () => void;
  sendTicket: (t: { subject: string; body: string; kind?: 'ticket' | 'report'; tableCode?: string }) => Promise<void>;
  tickets: () => Promise<any[]>;
}

const Ctx = createContext<SessionValue | null>(null);
const TOKEN_KEY = 'lr_token';
const DEVICE_KEY = 'lr_device';

async function store(key: string, value?: string | null) {
  if (Platform.OS === 'web') {
    try { if (value === undefined) return localStorage.getItem(key); if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch { /* ignore */ }
    return null;
  }
  if (value === undefined) return SecureStore.getItemAsync(key);
  if (value === null) await SecureStore.deleteItemAsync(key); else await SecureStore.setItemAsync(key, value);
  return null;
}

const newDeviceId = () => 'dev-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

export class ApiError extends Error { constructor(msg: string, readonly status: number) { super(msg); } }

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('starting');
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [connected, setConnected] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [table, setTable] = useState<TableView | null>(null);
  const [lastResult, setLastResult] = useState<SessionValue['lastResult']>(null);
  const token = useRef<string | null>(null);
  const socket = useRef<Socket | null>(null);
  const listeners = useRef(new Set<(e: TableEvent) => void>());
  const tableRef = useRef<TableView | null>(null);
  const [attempt, setAttempt] = useState(0);

  const call = useCallback(async <T,>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> => {
    const res = await fetch(API_URL + path, {
      method: init.method ?? (init.body !== undefined ? 'POST' : 'GET'),
      headers: { 'content-type': 'application/json', ...(token.current ? { authorization: `Bearer ${token.current}` } : {}) },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(json.error ?? 'Could not reach Local Rummy.', res.status);
    return json as T;
  }, []);

  // sign in, then open the live connection
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setStatus('starting'); setError(null);
        let deviceId = await store(DEVICE_KEY);
        if (!deviceId) { deviceId = newDeviceId(); await store(DEVICE_KEY, deviceId); }
        const auth = await call<{ token: string; player: Me }>('/api/auth/guest', {
          body: { deviceId, device: `${Platform.OS} ${Platform.Version}`.slice(0, 80), appVersion: APP_VERSION },
        });
        if (cancelled) return;
        token.current = auth.token;
        await store(TOKEN_KEY, auth.token);
        setMe(auth.player);
        const [cfg, ban] = await Promise.all([call<PublicConfig>('/api/config'), call<Banner[]>('/api/banners').catch(() => [])]);
        if (cancelled) return;
        setConfig(cfg); setBanners(ban);

        const s = io(API_URL, { auth: { token: auth.token }, transports: ['websocket'], reconnectionDelayMax: 5000 });
        socket.current = s;
        s.on('connect', () => {
          setConnected(true);
          // back to a running table after a dropped connection
          s.emit('rejoin', {}, (r: Ack & { table?: TableView }) => { if (r.ok && r.table) { tableRef.current = r.table; setTable(r.table); } });
        });
        s.on('disconnect', () => setConnected(false));
        s.on('connect_error', () => setConnected(false));
        s.on('config', (c: PublicConfig) => setConfig(c));
        s.on('wallet', (w: { chips: number }) => setMe((m) => (m ? { ...m, chips: w.chips } : m)));
        s.on('table', (v: TableView) => { tableRef.current = v; setTable(v); setNotice(null); });
        // the organiser removed us, or cancelled / expired the table before it started
        s.on('removed', (m: { message: string }) => { tableRef.current = null; setTable(null); setNotice(m.message); });
        s.on('invites', (list: Invite[]) => setInvites(list));
        s.on('invite', (inv: Invite) => setInvites((l) => [inv, ...l.filter((x) => x.id !== inv.id)]));
        s.on('invite:closed', (m: { id: number }) => setInvites((l) => l.filter((x) => x.id !== m.id)));
        s.on('event', (e: TableEvent) => {
          if (e.type === 'ended' && tableRef.current) setLastResult({ result: e.result, table: tableRef.current });
          listeners.current.forEach((fn) => fn(e));
        });
        setStatus('ready');
      } catch (e) {
        if (cancelled) return;
        const err = e as ApiError;
        setStatus(err.status === 403 ? 'blocked' : 'offline');
        setError(err.message || 'Could not reach Local Rummy.');
      }
    })();
    return () => { cancelled = true; socket.current?.removeAllListeners(); socket.current?.close(); socket.current = null; };
  }, [call, attempt]);

  const emit = useCallback((ev: string, data: object = {}) => new Promise<Ack>((resolve) => {
    const s = socket.current;
    if (!s?.connected) { resolve({ ok: false, error: 'No connection. Check your internet.' }); return; }
    const t = setTimeout(() => resolve({ ok: false, error: 'The server did not answer. Try again.' }), 8000);
    s.emit(ev, data, (r: Ack) => { clearTimeout(t); resolve(r); });
  }), []);

  const refreshMe = useCallback(async () => { setMe(await call<Me>('/api/me')); }, [call]);

  const value = useMemo<SessionValue>(() => ({
    status, error, me, config, banners, connected, table, notice, invites, lastResult,
    retry: () => setAttempt((a) => a + 1),
    refreshMe,
    claimBonus: async () => {
      const r = await call<{ amount: number; chips: number }>('/api/me/bonus', { body: {} });
      await refreshMe();
      return r;
    },
    refill: async () => {
      const r = await call<{ amount: number; chips: number }>('/api/me/refill', { body: {} });
      await refreshMe();
      return r;
    },
    rename: async (name: string) => { setMe(await call<Me>('/api/me', { method: 'PATCH', body: { name } })); },
    saveProfile: async (patch) => {
      try { setMe(await call<Me>('/api/me', { method: 'PATCH', body: patch })); return null; }
      catch (e) { return (e as Error).message || 'Could not save your profile.'; }
    },
    seat: async (mode, players, entry) => {
      setTable(null); tableRef.current = null; setLastResult(null);
      return emit('seat', { mode, players, entry });
    },
    createPrivate: async (mode, players, entry) => {
      setTable(null); tableRef.current = null; setLastResult(null);
      return emit('private:create', { mode, players, entry });
    },
    joinPrivate: async (code) => {
      setTable(null); tableRef.current = null; setLastResult(null);
      return emit('private:join', { code });
    },
    joinInvite: async (inv) => {
      setTable(null); tableRef.current = null; setLastResult(null);
      const r = await emit('private:join', { code: inv.code });
      setInvites((l) => l.filter((x) => x.id !== inv.id));
      return r;
    },
    declineInvite: (inv) => {
      setInvites((l) => l.filter((x) => x.id !== inv.id));
      emit('invite:decline', { id: inv.id }).catch(() => {});
    },
    startPrivate: (fillAi) => emit('private:start', { fillAi }),
    draw: (from) => emit('draw', { from }),
    discard: (cardId) => emit('discard', { cardId }),
    declare: (cardId) => emit('declare', { cardId }),
    drop: () => emit('drop'),
    leave: async () => { const r = await emit('leave'); setTable(null); tableRef.current = null; return r; },
    chat: (text) => emit('chat', { text }),
    onEvent: (fn) => { listeners.current.add(fn); return () => { listeners.current.delete(fn); }; },
    sendTicket: async (t) => { await call('/api/tickets', { body: t }); },
    tickets: () => call<any[]>('/api/tickets'),
  }), [status, error, me, config, banners, connected, table, notice, invites, lastResult, call, emit, refreshMe]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useSession must be used inside SessionProvider');
  return c;
}

/** True when this app is older than the minimum version the admin set. */
export function needsUpdate(min: string | undefined) {
  if (!min) return false;
  const a = APP_VERSION.split('.').map(Number), b = min.split('.').map(Number);
  for (let i = 0; i < 3; i++) { if ((a[i] ?? 0) > (b[i] ?? 0)) return false; if ((a[i] ?? 0) < (b[i] ?? 0)) return true; }
  return false;
}

export const initialsOf = (name: string) => name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'LR';
