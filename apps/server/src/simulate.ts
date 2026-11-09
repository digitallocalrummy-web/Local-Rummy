/**
 * End-to-end check against a running server: signs in a guest, collects the bonus, sits at a
 * table with bots and plays until the deal ends, then reads the admin views.
 *   pnpm --filter @local-rummy/server exec tsx src/simulate.ts [players] [entry]
 */
import { arrange, bestDiscard, botWantsOpenCard, type Card, type Rank } from '@local-rummy/rummy';
import { io } from 'socket.io-client';

const API = process.env.API ?? 'http://localhost:4000';
const players = Number(process.argv[2] ?? 4);
const entry = Number(process.argv[3] ?? 50);

async function api(path: string, init: RequestInit & { token?: string } = {}) {
  const res = await fetch(API + path, { ...init, headers: { 'content-type': 'application/json', ...(init.token ? { authorization: `Bearer ${init.token}` } : {}) } });
  const json = await res.json();
  if (!res.ok) throw new Error(`${path}: ${json.error}`);
  return json;
}

async function main() {
  const { token, player } = await api('/api/auth/guest', { method: 'POST', body: JSON.stringify({ deviceId: `sim-${Date.now()}`, name: 'Sim Player' }) });
  console.log('signed in', player.code, 'chips', player.chips);
  const bonus = await api('/api/me/bonus', { method: 'POST', token, body: '{}' });
  console.log('bonus +', bonus.amount, '→', bonus.chips);

  const s = io(API, { auth: { token }, transports: ['websocket'] });
  const emit = (ev: string, data: object = {}) => new Promise<any>((res) => s.emit(ev, data, res));
  let view: any = null;
  let busy = false;
  const t0 = Date.now();

  const done = new Promise<any>((resolve) => {
    s.on('event', (e) => { if (e.type === 'ended') resolve(e.result); });
  });
  s.on('wallet', (w) => console.log('wallet', w.chips));
  const play = async (v: any): Promise<void> => {
    if (busy || v.phase !== 'playing' || v.turn !== v.you) return;
    busy = true;
    try {
      const wild = v.wildRank as Rank;
      if (v.canDraw) {
        const take = botWantsOpenCard(v.hand as Card[], v.open?.card ?? null, wild);
        const r = await emit('draw', { from: take ? 'open' : 'deck' });
        if (!r.ok) console.log('draw error', r.error);
      } else if (v.canDiscard) {
        const { card } = bestDiscard(v.hand as Card[], wild);
        const rest = (v.hand as Card[]).filter((c) => c.id !== card.id);
        const r = arrange(rest, wild).valid ? await emit('declare', { cardId: card.id }) : await emit('discard', { cardId: card.id });
        if (!r.ok) console.log('discard error', r.error);
      }
    } finally { busy = false; }
    if (view !== v) await play(view); // a newer view arrived while we were acting
  };
  s.on('table', (v) => { view = v; play(v); });

  await new Promise<void>((r) => s.on('connect', () => r()));
  const seat = await emit('seat', { mode: 'points', players, entry });
  if (!seat.ok) throw new Error(seat.error);
  console.log('seated at', seat.tableId);
  const result = await Promise.race([done, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8 * 60_000))]);
  console.log(`deal ended (${result.reason}) after ${Math.round((Date.now() - t0) / 1000)} s, ${view?.seats?.length} seats`);
  for (const r of (result as any).seats) console.log(`  ${r.won ? '★' : ' '} ${r.name.padEnd(10)} ${String(r.points).padStart(3)} pts ${r.chips >= 0 ? '+' : ''}${r.chips}`);
  await new Promise((r) => setTimeout(r, 800));
  const me = await api('/api/me', { token });
  console.log('final chips', me.chips, 'games', me.gamesPlayed);
  s.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
