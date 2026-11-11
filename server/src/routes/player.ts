/** Routes the mobile app calls. */
import { and, asc, desc, eq, gte, inArray, isNull, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { randomInt } from 'node:crypto';
import { z } from 'zod';
import { requirePlayer, signPlayer } from '../auth';
import { getConfig, publicConfig } from '../config';
import { db, schema } from '../db';
import { moveChips } from '../wallet';

const COLORS = ['#1F6B4A', '#8C3B2E', '#3B5E8C', '#5C3B7A', '#2E6E8C', '#8C6A2E', '#7A3B5C', '#4A7A3B', '#8C2E4A', '#3B4A8C'];

/** Calendar day in India, e.g. "2026-11-09". Daily bonuses reset at midnight IST. */
export const istDay = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

export function bonusState(p: { lastBonusAt: Date | null; bonusStreak: number }, now = new Date()) {
  const cfg = getConfig().bonus;
  const today = istDay(now);
  const yesterday = istDay(new Date(now.getTime() - 86_400_000));
  const last = p.lastBonusAt ? istDay(p.lastBonusAt) : null;
  const available = last !== today;
  const nextStreak = last === yesterday ? (p.bonusStreak % 7) + 1 : last === today ? p.bonusStreak : 1;
  const amount = Math.round(cfg.day1 * (cfg.multipliers[nextStreak - 1] ?? 1));
  return { available, day: nextStreak, amount };
}

/** Where a player's photo is served; the version busts phone caches after a change. */
export const photoPath = (p: { id: string; photo: string | null; photoVersion: number }) => (p.photo ? `/api/avatars/${p.id}?v=${p.photoVersion}` : null);

/** A small set of friendly emoji; new players get one at random until they choose. */
export const AVATAR_EMOJI = ['😀', '😎', '🤠', '🥳', '😺', '🦁', '🐯', '🐼', '🦊', '🐸', '🐵', '🦄', '🐲', '👑', '🎩', '🌟', '🔥', '🍀', '🎯', '🃏'];

const publicPlayer = (p: typeof schema.players.$inferSelect) => ({
  id: p.id, code: p.code, name: p.name, color: p.color, chips: p.chips, level: p.level,
  avatar: p.avatar, photoUrl: photoPath(p), profileDone: p.profileDone,
  gamesPlayed: p.gamesPlayed, gamesWon: p.gamesWon, status: p.status,
  bonus: bonusState(p),
});

async function newCode(): Promise<string> {
  for (;;) {
    const code = `LR-${randomInt(10000, 99999)}`;
    const hit = await db.query.players.findFirst({ where: eq(schema.players.code, code), columns: { id: true } });
    if (!hit) return code;
  }
}

export async function playerRoutes(app: FastifyInstance) {
  app.get('/api/config', async () => publicConfig());

  app.get('/api/banners', async () => db.select({
    id: schema.banners.id, title: schema.banners.title, subtitle: schema.banners.subtitle, color: schema.banners.color, target: schema.banners.target,
  }).from(schema.banners).where(eq(schema.banners.status, 'live')).orderBy(asc(schema.banners.sort)));

  /** Guest sign-in by device id. Google or phone sign-in can be added on top later. */
  app.post('/api/auth/guest', async (req, reply) => {
    const body = z.object({
      deviceId: z.string().min(8).max(200),
      name: z.string().trim().min(2).max(20).optional(),
      device: z.string().max(80).optional(),
      appVersion: z.string().max(20).optional(),
    }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'Invalid sign-in request.' });
    const { deviceId, name, device, appVersion } = body.data;
    let p = await db.query.players.findFirst({ where: eq(schema.players.deviceId, deviceId) });
    if (!p) {
      const code = await newCode();
      [p] = await db.insert(schema.players).values({
        code, deviceId, device, appVersion, name: name ?? `Player ${code.slice(3)}`, color: COLORS[randomInt(0, COLORS.length)],
        avatar: AVATAR_EMOJI[randomInt(0, AVATAR_EMOJI.length)],
      }).returning();
      const welcome = getConfig().welcome;
      if (welcome > 0) p.chips = await moveChips(p.id, welcome, 'welcome', { note: 'Welcome chips' });
    } else {
      await db.update(schema.players).set({ lastActiveAt: new Date(), device: device ?? p.device, appVersion: appVersion ?? p.appVersion }).where(eq(schema.players.id, p.id));
    }
    if (p.status === 'blocked') return reply.code(403).send({ error: 'This account is blocked. Contact support.' });
    return { token: signPlayer(p.id), player: publicPlayer(p) };
  });

  /** Profile photos (public, by player id; cached for a day, the ?v= changes on update). */
  app.get('/api/avatars/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!/^[0-9a-f-]{36}$/i.test(id)) return reply.code(404).send({ error: 'Not found.' });
    const p = await db.query.players.findFirst({ where: eq(schema.players.id, id), columns: { photo: true } });
    if (!p?.photo) return reply.code(404).send({ error: 'Not found.' });
    reply.header('content-type', 'image/jpeg').header('cache-control', 'public, max-age=86400');
    return reply.send(Buffer.from(p.photo, 'base64'));
  });

  app.register(async (auth) => {
    auth.addHook('preHandler', requirePlayer);

    auth.get('/api/me', async (req, reply) => {
      const p = await db.query.players.findFirst({ where: eq(schema.players.id, req.player!.sub) });
      if (!p) return reply.code(404).send({ error: 'Player not found.' });
      return publicPlayer(p);
    });

    auth.patch('/api/me', { bodyLimit: 1_000_000 }, async (req, reply) => {
      const body = z.object({
        name: z.string().trim().min(2).max(20).regex(/^[\p{L}\p{N} ._'-]+$/u).optional(),
        pushToken: z.string().max(300).optional(),
        avatar: z.string().min(1).max(16).optional(),
        /** base64 JPEG, already resized on the phone (about 256 × 256) */
        photo: z.string().max(400_000).regex(/^\/9j\//, 'Photos must be JPEG').optional(),
        removePhoto: z.boolean().optional(),
        profileDone: z.boolean().optional(),
      }).safeParse(req.body);
      if (!body.success) {
        const field = body.error.issues[0]?.path[0];
        return reply.code(400).send({ error: field === 'photo' ? 'That photo could not be used. Try another one.' : field === 'avatar' ? 'Pick an emoji.' : 'Names are 2 to 20 letters or numbers.' });
      }
      const { photo, removePhoto, ...rest } = body.data;
      const set: Partial<typeof schema.players.$inferInsert> = { ...rest };
      if (photo) { set.photo = photo; set.photoVersion = sql`${schema.players.photoVersion} + 1` as unknown as number; }
      else if (removePhoto) set.photo = null;
      const [p] = await db.update(schema.players).set(set).where(eq(schema.players.id, req.player!.sub)).returning();
      return publicPlayer(p);
    });

    auth.post('/api/me/bonus', async (req, reply) => {
      const p = await db.query.players.findFirst({ where: eq(schema.players.id, req.player!.sub) });
      if (!p) return reply.code(404).send({ error: 'Player not found.' });
      const b = bonusState(p);
      if (!b.available) return reply.code(409).send({ error: 'You already collected today’s bonus. Come back tomorrow.' });
      // claim first so a double tap cannot pay twice
      const [claimed] = await db.update(schema.players).set({ lastBonusAt: new Date(), bonusStreak: b.day })
        .where(and(eq(schema.players.id, p.id), p.lastBonusAt ? eq(schema.players.lastBonusAt, p.lastBonusAt) : isNull(schema.players.lastBonusAt)))
        .returning({ id: schema.players.id });
      if (!claimed) return reply.code(409).send({ error: 'Bonus already collected.' });
      const chips = await moveChips(p.id, b.amount, 'daily_bonus', { note: `Day ${b.day}` });
      return { chips, amount: b.amount, day: b.day };
    });

    /** Free top-up once a day when a player runs out of chips. */
    auth.post('/api/me/refill', async (req, reply) => {
      const cfg = getConfig();
      const p = await db.query.players.findFirst({ where: eq(schema.players.id, req.player!.sub) });
      if (!p) return reply.code(404).send({ error: 'Player not found.' });
      if (p.chips >= 50 || cfg.refill <= 0) return reply.code(409).send({ error: 'Refills are for players who are out of chips.' });
      const since = new Date(Date.now() - 86_400_000);
      const recent = await db.query.chipTxs.findFirst({ where: and(eq(schema.chipTxs.playerId, p.id), eq(schema.chipTxs.type, 'refill'), gte(schema.chipTxs.createdAt, since)) });
      if (recent) return reply.code(409).send({ error: 'You can get one free refill a day.' });
      const chips = await moveChips(p.id, cfg.refill, 'refill', { note: 'Free refill' });
      return { chips, amount: cfg.refill };
    });

    auth.get('/api/me/games', async (req) => {
      const rows = await db.select({ game: schema.games, me: schema.gamePlayers })
        .from(schema.gamePlayers).innerJoin(schema.games, eq(schema.games.id, schema.gamePlayers.gameId))
        .where(eq(schema.gamePlayers.playerId, req.player!.sub)).orderBy(desc(schema.games.endedAt)).limit(20);
      return rows.map((r) => ({ id: r.game.id, mode: r.game.mode, players: r.game.players, entry: r.game.entry, endedAt: r.game.endedAt, points: r.me.points, chips: r.me.chips, won: r.me.won }));
    });

    auth.post('/api/tickets', async (req, reply) => {
      const body = z.object({
        kind: z.enum(['ticket', 'report']).default('ticket'),
        subject: z.string().trim().min(3).max(120),
        body: z.string().trim().min(3).max(2000),
        tag: z.string().max(20).optional(),
        againstCode: z.string().max(20).optional(),
        tableCode: z.string().max(20).optional(),
      }).safeParse(req.body);
      if (!body.success) return reply.code(400).send({ error: 'Please add a subject and a message.' });
      const d = body.data;
      const against = d.againstCode ? await db.query.players.findFirst({ where: eq(schema.players.code, d.againstCode) }) : null;
      const [t] = await db.insert(schema.tickets).values({
        kind: d.kind, playerId: req.player!.sub, subject: d.subject, tag: (d.tag ?? (d.kind === 'report' ? 'REPORT' : 'GENERAL')).toUpperCase(),
        againstPlayerId: against?.id, tableCode: d.tableCode,
      }).returning();
      await db.insert(schema.ticketMessages).values({ ticketId: t.id, body: d.body });
      return { id: t.id };
    });

    auth.get('/api/tickets', async (req) => {
      const mine = await db.query.tickets.findMany({ where: eq(schema.tickets.playerId, req.player!.sub), orderBy: desc(schema.tickets.createdAt), limit: 20 });
      const msgs = mine.length ? await db.query.ticketMessages.findMany({ where: inArray(schema.ticketMessages.ticketId, mine.map((t) => t.id)), orderBy: asc(schema.ticketMessages.createdAt) }) : [];
      return mine.map((t) => ({ ...t, messages: msgs.filter((m) => m.ticketId === t.id).map((m) => ({ body: m.body, fromSupport: !!m.fromAdminId, at: m.createdAt })) }));
    });
  });
}
