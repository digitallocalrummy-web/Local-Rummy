/**
 * Matchmaking, chip escrow and history for all tables, plus the Socket.io wiring.
 *
 * Socket events (client → server, each with an ack callback `(res: { ok, error?, ... })`):
 *   seat      { mode, players, entry }    find or create a table and sit down
 *   rejoin    {}                          get back to your running table after reconnecting
 *   draw      { from: 'deck' | 'open' }
 *   discard   { cardId }
 *   declare   { cardId }                  throw cardId and show the other 13 cards
 *   drop      {}
 *   leave     {}
 *   chat      { text }
 *   private:create { mode, players, entry }  open a Play with Friends table → { code }
 *   private:join   { code }                  join a friend's table
 *   private:start  { fillAi }                host starts (empty seats get AI, or the table shrinks)
 * Server → client:
 *   table     personal view of the table (hand, seats, open card, turn, result)
 *   event     animation events (dealt, drew, discarded, turn, dropped, declared, ended, chat)
 *   wallet    { chips }
 *   config    public game settings, sent again whenever an admin publishes
 */
import { eq, sql } from 'drizzle-orm';
import { photoPath } from '../routes/player';
import { randomInt } from 'node:crypto';
import type { Server, Socket } from 'socket.io';
import { verifyPlayer } from '../auth';
import { configEvents, getConfig, MODE_IDS, publicConfig, type ModeId } from '../config';
import { db, schema } from '../db';
import { InsufficientChips, moveChips } from '../wallet';
import { Table, type TableEvent, type TableResult } from './table';

const tables = new Map<string, Table>();
/** playerId → table id */
const playerTable = new Map<string, string>();
let io: Server | null = null;

const room = (t: Table) => `table:${t.id}`;
const playerRoom = (playerId: string) => `player:${playerId}`;

export function liveTables() { return [...tables.values()]; }
export function getTable(id: string) { return tables.get(id); }
export function onlineCount() { return io ? io.of('/').sockets.size : 0; }

const hooks = {
  onChange(t: Table) {
    if (!io) return;
    for (const s of t.humans) if (s.playerId) io.to(playerRoom(s.playerId)).emit('table', t.view(s.idx));
  },
  onEvent(t: Table, e: TableEvent) {
    io?.to(room(t)).emit('event', e);
  },
  onEnd(t: Table, r: TableResult) {
    settle(t, r).catch((err) => console.error('settle failed', t.id, err));
  },
};

async function settle(t: Table, r: TableResult) {
  for (const s of t.seats) if (s.playerId) playerTable.delete(s.playerId);
  const cancelled = r.reason === 'cancelled';
  // pay out: escrow back minus what each loser owes; the winner also collects the pot
  for (const res of r.seats) {
    const seat = t.seats[res.idx];
    if (!seat.playerId) continue;
    const back = cancelled ? seat.escrow : seat.escrow + res.chips;
    try {
      if (back > 0) await moveChips(seat.playerId, back, res.won ? 'win' : 'refund', { tableCode: t.id, note: cancelled ? 'Deal cancelled by admin' : undefined });
      await db.update(schema.players).set({
        gamesPlayed: sql`${schema.players.gamesPlayed} + 1`,
        gamesWon: sql`${schema.players.gamesWon} + ${res.won ? 1 : 0}`,
        xp: sql`${schema.players.xp} + ${res.won ? 30 : 10}`,
        level: sql`1 + (${schema.players.xp} + ${res.won ? 30 : 10}) / 250`,
        lastActiveAt: new Date(),
      }).where(eq(schema.players.id, seat.playerId));
      await pushWallet(seat.playerId);
    } catch (e) { console.error('payout failed', seat.playerId, e); }
  }
  const winner = r.seats.find((s) => s.won);
  const [g] = await db.insert(schema.games).values({
    tableCode: t.id, mode: t.mode, players: t.size, entry: t.entry,
    winnerName: winner?.name ?? null, winnerPlayerId: winner?.playerId ?? null,
    startedAt: new Date(t.startedAt || t.createdAt), endReason: r.reason,
    results: r.seats.map(({ melds: _m, ...rest }) => rest),
  }).returning({ id: schema.games.id });
  const humanRows = r.seats.filter((s) => s.playerId).map((s) => ({ gameId: g.id, playerId: s.playerId!, points: s.points, chips: cancelled ? 0 : s.chips, won: s.won }));
  if (humanRows.length) await db.insert(schema.gamePlayers).values(humanRows);
  // keep the finished table around briefly so apps can show the result, then forget it
  setTimeout(() => { t.dispose(); tables.delete(t.id); }, 60_000);
}

async function pushWallet(playerId: string) {
  const p = await db.query.players.findFirst({ where: eq(schema.players.id, playerId), columns: { chips: true } });
  if (p) io?.to(playerRoom(playerId)).emit('wallet', { chips: p.chips });
}

/** Checks shared by quick seating and private tables. */
async function checkSeat(playerId: string, mode: ModeId, size: number, entry: number) {
  const cfg = getConfig();
  if (cfg.maintenance) throw new Error('Local Rummy is under maintenance. Please try again soon.');
  const m = cfg.modes[mode];
  if (!m?.enabled) throw new Error('This game mode is not available right now.');
  if (size < 1 || size > m.maxPlayers) throw new Error(`Choose 1 to ${m.maxPlayers} players.`);
  // entry 0 = free practice table (always allowed); otherwise one of the admin's tiers
  if (size === 1) entry = 0;
  else if (entry !== 0 && !m.entries.includes(entry)) throw new Error('That entry amount is not offered.');
  return { cfg, entry };
}

async function loadPlayer(playerId: string) {
  const existing = playerTable.get(playerId);
  if (existing && tables.get(existing)?.phase !== 'ended') throw new Error('You are already at a table.');
  const p = await db.query.players.findFirst({ where: eq(schema.players.id, playerId) });
  if (!p) throw new Error('Player not found.');
  if (p.status === 'blocked') throw new Error('Your account is blocked. Contact support.');
  return p;
}

/** Takes the entry and sits the player down at `t`. Registers `t` if it is new. */
async function sitDown(p: typeof schema.players.$inferSelect, t: Table, fresh: boolean) {
  const entry = t.entry;
  if (entry > 0) {
    try { await moveChips(p.id, -entry, 'entry', { tableCode: t.id, note: `${t.mode} · ${t.size} players${t.privateCode ? ' · private' : ''}` }); }
    catch (e) { if (e instanceof InsufficientChips) throw new Error(`This table needs ${entry} chips.`); throw e; }
  }
  // the table may have filled up while the chips moved
  if (t.phase !== 'waiting' || t.isFull) {
    if (entry > 0) await moveChips(p.id, entry, 'refund', { tableCode: t.id, note: 'Table filled up' });
    throw new Error('That table just filled up. Please try again.');
  }
  if (fresh) tables.set(t.id, t);
  const initials = p.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'LR';
  playerTable.set(p.id, t.id);
  t.addHuman({ id: p.id, name: p.name, code: initials, color: p.color, avatar: p.avatar, photo: photoPath(p) }, entry);
  if (entry > 0) await pushWallet(p.id);
}

/** Finds an open public table with the same mode, size and entry, or opens a new one. */
async function seat(playerId: string, mode: ModeId, size: number, entryIn: number) {
  const { cfg, entry } = await checkSeat(playerId, mode, size, entryIn);
  const p = await loadPlayer(playerId);
  let t = [...tables.values()].find((x) => !x.privateCode && x.phase === 'waiting' && x.mode === mode && x.size === size && x.entry === entry && !x.isFull);
  const fresh = !t;
  if (!t) t = new Table(mode, size, entry, cfg, hooks);
  await sitDown(p, t, fresh);
  // fill the empty seats with bots if no one else turns up soon
  const tt = t;
  if (tt.phase === 'waiting') setTimeout(() => { if (tt.phase === 'waiting') tt.fillWithBots(); }, cfg.botFillSeconds * 1000);
  return t;
}

const PRIVATE_WAIT_MS = 15 * 60_000;

/** Play with Friends: opens a private table and returns it with its 4-digit code. */
async function openPrivate(playerId: string, mode: ModeId, size: number, entryIn: number) {
  if (!getConfig().friendsTables) throw new Error('Private tables are turned off right now.');
  if (size < 2) throw new Error('A table with friends needs at least 2 players.');
  const { cfg, entry } = await checkSeat(playerId, mode, size, entryIn);
  const p = await loadPlayer(playerId);
  const used = new Set([...tables.values()].map((x) => x.privateCode).filter(Boolean));
  let code = '';
  do code = String(randomInt(1000, 10000)); while (used.has(code));
  const t = new Table(mode, size, entry, cfg, hooks);
  t.privateCode = code;
  t.hostId = playerId;
  await sitDown(p, t, true);
  // close a private table nobody started after 15 minutes and give the entries back
  setTimeout(() => {
    if (t.phase !== 'waiting') return;
    for (const s of t.humans) if (s.playerId) leaveWaiting(s.playerId, t).catch(() => {});
  }, PRIVATE_WAIT_MS);
  return t;
}

async function joinPrivate(playerId: string, codeIn: string) {
  const code = codeIn.replace(/\D/g, '');
  const t = [...tables.values()].find((x) => x.privateCode === code && x.phase !== 'ended');
  if (!t) throw new Error('No table with that code. Check the number with your friend.');
  if (t.phase !== 'waiting') throw new Error('That game has already started.');
  if (t.isFull) throw new Error('That table is full.');
  if (getConfig().maintenance) throw new Error('Local Rummy is under maintenance. Please try again soon.');
  const p = await loadPlayer(playerId);
  await sitDown(p, t, false);
  return t;
}

async function leaveWaiting(playerId: string, t: Table) {
  const s = t.removeWaiting(playerId);
  playerTable.delete(playerId);
  if (s?.escrow) { await moveChips(playerId, s.escrow, 'refund', { tableCode: t.id, note: 'Left before the deal' }); await pushWallet(playerId); }
  const left = t.seats.filter((x) => x.kind === 'human');
  if (!left.length) { t.dispose(); tables.delete(t.id); return; }
  // the host left a private table: the next friend becomes host
  if (t.hostId === playerId) t.hostId = left[0].playerId ?? null;
  hooks.onChange(t);
}

type Ack = (res: Record<string, unknown>) => void;
const safeAck = (ack: unknown): Ack => (typeof ack === 'function' ? (ack as Ack) : () => {});

export function attachSockets(server: Server) {
  io = server;

  io.use((socket, next) => {
    const t = verifyPlayer(String(socket.handshake.auth?.token ?? ''));
    if (!t) return next(new Error('unauthorized'));
    socket.data.playerId = t.sub;
    next();
  });

  configEvents.on('change', (c) => io?.emit('config', publicConfig(c)));

  io.on('connection', (socket: Socket) => {
    const playerId: string = socket.data.playerId;
    socket.join(playerRoom(playerId));
    socket.emit('config', publicConfig());
    db.update(schema.players).set({ lastActiveAt: new Date() }).where(eq(schema.players.id, playerId)).catch(() => {});

    const current = () => { const id = playerTable.get(playerId); return id ? tables.get(id) : undefined; };
    const mySeat = () => { const t = current(); const s = t?.seatOf(playerId); return t && s ? { t, s } : null; };

    // reconnecting player goes straight back to their table
    const back = mySeat();
    if (back) { socket.join(room(back.t)); back.t.setConnected(playerId, true); }

    socket.on('seat', async (msg: { mode?: string; players?: number; entry?: number }, ack) => {
      const done = safeAck(ack);
      try {
        const mode = MODE_IDS.includes(msg?.mode as ModeId) ? (msg.mode as ModeId) : null;
        if (!mode) throw new Error('Unknown game mode.');
        const t = await seat(playerId, mode, Math.floor(Number(msg.players)), Math.floor(Number(msg.entry ?? 0)));
        socket.join(room(t));
        hooks.onChange(t);
        done({ ok: true, tableId: t.id });
      } catch (e) { done({ ok: false, error: (e as Error).message }); }
    });

    socket.on('private:create', async (msg: { mode?: string; players?: number; entry?: number }, ack) => {
      const done = safeAck(ack);
      try {
        const mode = MODE_IDS.includes(msg?.mode as ModeId) ? (msg.mode as ModeId) : null;
        if (!mode) throw new Error('Unknown game mode.');
        const t = await openPrivate(playerId, mode, Math.floor(Number(msg.players)), Math.floor(Number(msg.entry ?? 0)));
        socket.join(room(t));
        hooks.onChange(t);
        done({ ok: true, tableId: t.id, code: t.privateCode });
      } catch (e) { done({ ok: false, error: (e as Error).message }); }
    });

    socket.on('private:join', async (msg: { code?: string }, ack) => {
      const done = safeAck(ack);
      try {
        const t = await joinPrivate(playerId, String(msg?.code ?? ''));
        socket.join(room(t));
        hooks.onChange(t);
        done({ ok: true, tableId: t.id });
      } catch (e) { done({ ok: false, error: (e as Error).message }); }
    });

    socket.on('private:start', (msg: { fillAi?: boolean }, ack) => {
      const done = safeAck(ack);
      const t = current();
      if (!t?.privateCode) return done({ ok: false, error: 'You are not at a private table.' });
      if (t.hostId !== playerId) return done({ ok: false, error: 'Only the host can start the game.' });
      const err = t.startNow(!!msg?.fillAi);
      if (!err) hooks.onChange(t);
      done(err ? { ok: false, error: err } : { ok: true });
    });

    socket.on('rejoin', (_m, ack) => {
      const done = safeAck(ack);
      const cur = mySeat();
      if (!cur) return done({ ok: false, error: 'No running table.' });
      socket.join(room(cur.t));
      cur.t.setConnected(playerId, true);
      done({ ok: true, table: cur.t.view(cur.s.idx) });
    });

    const act = (name: string, fn: (t: Table, idx: number, msg: any) => string | null) => {
      socket.on(name, (msg, ack) => {
        const done = safeAck(ack);
        const cur = mySeat();
        if (!cur) return done({ ok: false, error: 'You are not at a table.' });
        const err = fn(cur.t, cur.s.idx, msg ?? {});
        done(err ? { ok: false, error: err } : { ok: true });
      });
    };
    act('draw', (t, i, m) => t.draw(i, m.from === 'open' ? 'open' : 'deck'));
    act('discard', (t, i, m) => t.discard(i, String(m.cardId)));
    act('declare', (t, i, m) => t.declare(i, String(m.cardId)));
    act('drop', (t, i) => t.drop(i));
    act('chat', (t, i, m) => { t.chat(i, String(m.text ?? '')); return null; });

    socket.on('leave', async (_m, ack) => {
      const done = safeAck(ack);
      const t = current();
      if (!t) return done({ ok: true });
      if (t.phase === 'waiting') await leaveWaiting(playerId, t);
      else if (t.phase === 'playing') { const s = t.seatOf(playerId); if (s) t.drop(s.idx); }
      socket.leave(room(t));
      if (t.phase === 'ended') playerTable.delete(playerId);
      done({ ok: true });
    });

    socket.on('disconnect', async () => {
      const stillHere = (await io!.in(playerRoom(playerId)).fetchSockets()).length > 0;
      if (stillHere) return;
      const t = current();
      if (!t) return;
      if (t.phase === 'waiting') await leaveWaiting(playerId, t).catch(() => {});
      else t.setConnected(playerId, false); // turns time out and auto-play until they come back
    });
  });
}

/**
 * After a restart, running tables are gone. Give back any entry that was never settled
 * (no win or refund for the same player and table).
 */
export async function refundOrphanedEntries() {
  const res = await db.execute(sql`
    select e.player_id, e.table_code, -e.amount as amount from chip_txs e
    where e.type = 'entry' and e.table_code is not null and e.created_at > now() - interval '3 days'
      and not exists (select 1 from chip_txs x where x.player_id = e.player_id and x.table_code = e.table_code and x.type in ('win', 'refund'))`);
  for (const row of res.rows as { player_id: string; table_code: string; amount: number }[]) {
    await moveChips(row.player_id, Number(row.amount), 'refund', { tableCode: row.table_code, note: 'Server restarted during the deal' });
  }
  if (res.rows.length) console.log(`Refunded ${res.rows.length} entries from tables lost in a restart`);
}

/** Admin: stop a table and refund every entry. */
export function cancelTable(id: string): boolean {
  const t = tables.get(id);
  if (!t || t.phase === 'ended') return false;
  if (t.phase === 'waiting') {
    for (const s of t.humans) if (s.playerId) leaveWaiting(s.playerId, t).catch(() => {});
    return true;
  }
  t.cancel();
  return true;
}

/** Admin: skip the current turn of a table (e.g. a stuck player). */
export function skipTurn(id: string): boolean {
  const t = tables.get(id);
  if (!t || t.phase !== 'playing') return false;
  const s = t.seats[t.turn];
  if (!s) return false;
  if (!s.drawn) t.draw(s.idx, 'deck');
  t.discard(s.idx, s.hand[s.hand.length - 1].id);
  return true;
}

/** Admin: message everyone at a table. */
export function messageTable(id: string, text: string): boolean {
  const t = tables.get(id);
  if (!t) return false;
  io?.to(room(t)).emit('event', { type: 'chat', seat: -1, text: text.slice(0, 120) });
  return true;
}

/** Admin blocked a player: drop them from their table and disconnect. */
export function kickPlayer(playerId: string) {
  const id = playerTable.get(playerId);
  const t = id ? tables.get(id) : undefined;
  if (t?.phase === 'playing') { const s = t.seatOf(playerId); if (s) t.drop(s.idx); }
  else if (t?.phase === 'waiting') leaveWaiting(playerId, t).catch(() => {});
  io?.in(playerRoom(playerId)).disconnectSockets(true);
}

export { pushWallet };
