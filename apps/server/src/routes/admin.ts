/** Routes the admin panel calls. Everything here needs an admin token. */
import bcrypt from 'bcryptjs';
import { and, asc, count, desc, eq, gte, ilike, inArray, lt, or, sql, sum } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAdmin, signAdmin } from '../auth';
import { configSchema, getConfig, getConfigMeta, saveConfig } from '../config';
import { db, schema } from '../db';
import { cancelTable, kickPlayer, liveTables, messageTable, onlineCount, pushWallet, skipTurn } from '../game/manager';
import { sendPush } from '../push';
import { InsufficientChips, moveChips } from '../wallet';
import { bonusState, istDay } from './player';

const P = schema.players;
const dayAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
const startOfIstDay = (d = new Date()) => new Date(`${istDay(d)}T00:00:00+05:30`);

const playerRow = (p: typeof P.$inferSelect) => ({
  id: p.id, code: p.code, name: p.name, color: p.color, chips: p.chips, level: p.level, status: p.status,
  gamesPlayed: p.gamesPlayed, gamesWon: p.gamesWon, winRate: p.gamesPlayed ? Math.round((p.gamesWon / p.gamesPlayed) * 100) : 0,
  phone: p.phone, device: p.device, appVersion: p.appVersion, createdAt: p.createdAt, lastActiveAt: p.lastActiveAt,
  isNew: p.createdAt > dayAgo(7),
});

export async function adminRoutes(app: FastifyInstance) {
  app.post('/api/admin/login', async (req, reply) => {
    const body = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'Enter your email and password.' });
    const a = await db.query.admins.findFirst({ where: eq(schema.admins.email, body.data.email.toLowerCase()) });
    if (!a || !(await bcrypt.compare(body.data.password, a.passwordHash))) return reply.code(401).send({ error: 'Wrong email or password.' });
    return { token: signAdmin({ sub: a.id, role: a.role, name: a.name }), admin: { id: a.id, name: a.name, email: a.email, role: a.role } };
  });

  app.register(async (r) => {
    r.addHook('preHandler', requireAdmin());
    const canEdit = { preHandler: requireAdmin('moderator') };
    const superOnly = { preHandler: requireAdmin('super') };

    r.get('/api/admin/me', async (req) => req.admin);

    // ---------- overview ----------
    r.get('/api/admin/overview', async () => {
      const today = startOfIstDay();
      const yesterday = startOfIstDay(dayAgo(1));
      const [[dau], [dauY], [signups], [signupsY], [gamesToday], [gamesY]] = await Promise.all([
        db.select({ n: count() }).from(P).where(gte(P.lastActiveAt, today)),
        db.select({ n: count() }).from(P).where(and(gte(P.lastActiveAt, yesterday), lt(P.lastActiveAt, today))),
        db.select({ n: count() }).from(P).where(gte(P.createdAt, today)),
        db.select({ n: count() }).from(P).where(and(gte(P.createdAt, yesterday), lt(P.createdAt, today))),
        db.select({ n: count() }).from(schema.games).where(gte(schema.games.endedAt, today)),
        db.select({ n: count() }).from(schema.games).where(and(gte(schema.games.endedAt, yesterday), lt(schema.games.endedAt, today))),
      ]);
      const series = await db.execute(sql`
        select to_char(d, 'YYYY-MM-DD') as day,
          (select count(distinct gp.player_id) from game_players gp join games g on g.id = gp.game_id
             where (g.ended_at at time zone 'Asia/Kolkata')::date = d)::int as players
        from generate_series((now() at time zone 'Asia/Kolkata')::date - 13, (now() at time zone 'Asia/Kolkata')::date, interval '1 day') d`);
      const modes = await db.select({ mode: schema.games.mode, n: count(), avgPlayers: sql<number>`avg(${schema.games.players})::float`, avgSecs: sql<number>`avg(extract(epoch from ${schema.games.endedAt} - ${schema.games.startedAt}))::float` })
        .from(schema.games).where(gte(schema.games.endedAt, today)).groupBy(schema.games.mode);
      const [reports] = await db.select({ n: count() }).from(schema.tickets).where(and(eq(schema.tickets.kind, 'report'), eq(schema.tickets.status, 'open')));
      const [openTickets] = await db.select({ n: count() }).from(schema.tickets).where(and(eq(schema.tickets.kind, 'ticket'), eq(schema.tickets.status, 'open')));
      const [urgent] = await db.select({ n: count() }).from(schema.tickets).where(and(eq(schema.tickets.status, 'open'), eq(schema.tickets.urgent, true)));
      const activity = await db.select({ tx: schema.chipTxs, name: P.name, color: P.color }).from(schema.chipTxs).innerJoin(P, eq(P.id, schema.chipTxs.playerId)).orderBy(desc(schema.chipTxs.createdAt)).limit(6);
      const tables = liveTables().map((t) => t.adminView());
      return {
        online: onlineCount(),
        dau: dau.n, dauYesterday: dauY.n, signups: signups.n, signupsYesterday: signupsY.n, gamesToday: gamesToday.n, gamesYesterday: gamesY.n,
        series: series.rows, modes,
        tables: { running: tables.filter((t) => t.phase !== 'ended').length, stuck: tables.filter((t) => t.status === 'stuck').length, top: tables.slice(0, 6) },
        alerts: { reports: reports.n, tickets: openTickets.n, urgent: urgent.n },
        activity: activity.map((a) => ({ name: a.name, color: a.color, type: a.tx.type, amount: a.tx.amount, at: a.tx.createdAt, table: a.tx.tableCode })),
      };
    });

    // ---------- players ----------
    r.get('/api/admin/players', async (req) => {
      const q = z.object({ filter: z.enum(['all', 'active', 'new', 'blocked']).default('all'), q: z.string().optional(), page: z.coerce.number().int().min(1).default(1) }).parse(req.query);
      const where = and(
        q.filter === 'blocked' ? eq(P.status, 'blocked') : q.filter === 'active' ? eq(P.status, 'active') : undefined,
        q.filter === 'new' ? gte(P.createdAt, dayAgo(7)) : undefined,
        q.q ? or(ilike(P.name, `%${q.q}%`), ilike(P.code, `%${q.q}%`), ilike(P.phone, `%${q.q}%`)) : undefined,
      );
      const [rows, [total], [all]] = await Promise.all([
        db.select().from(P).where(where).orderBy(desc(P.lastActiveAt)).limit(25).offset((q.page - 1) * 25),
        db.select({ n: count() }).from(P).where(where),
        db.select({ n: count() }).from(P),
      ]);
      return { rows: rows.map(playerRow), total: total.n, registered: all.n, online: onlineCount(), page: q.page, pageSize: 25 };
    });

    r.get('/api/admin/players/:id', async (req, reply) => {
      const { id } = req.params as { id: string };
      const p = await db.query.players.findFirst({ where: eq(P.id, id) });
      if (!p) return reply.code(404).send({ error: 'Player not found.' });
      const games = await db.select({ g: schema.games, me: schema.gamePlayers }).from(schema.gamePlayers)
        .innerJoin(schema.games, eq(schema.games.id, schema.gamePlayers.gameId)).where(eq(schema.gamePlayers.playerId, id))
        .orderBy(desc(schema.games.endedAt)).limit(5);
      const fav = await db.select({ mode: schema.games.mode, n: count() }).from(schema.gamePlayers)
        .innerJoin(schema.games, eq(schema.games.id, schema.gamePlayers.gameId)).where(eq(schema.gamePlayers.playerId, id))
        .groupBy(schema.games.mode).orderBy(desc(count())).limit(1);
      return {
        ...playerRow(p), favouriteMode: fav[0]?.mode ?? null, bonus: bonusState(p),
        recentGames: games.map((x) => ({ mode: x.g.mode, players: x.g.players, chips: x.me.chips, won: x.me.won, at: x.g.endedAt })),
      };
    });

    r.post('/api/admin/players/:id/block', canEdit, async (req, reply) => {
      const { id } = req.params as { id: string };
      const { blocked } = z.object({ blocked: z.boolean() }).parse(req.body);
      const [p] = await db.update(P).set({ status: blocked ? 'blocked' : 'active' }).where(eq(P.id, id)).returning();
      if (!p) return reply.code(404).send({ error: 'Player not found.' });
      if (blocked) kickPlayer(id);
      return playerRow(p);
    });

    r.post('/api/admin/players/:id/chips', canEdit, async (req, reply) => {
      const { id } = req.params as { id: string };
      const body = z.object({ amount: z.number().int().refine((n) => n !== 0), reason: z.string().trim().min(3).max(120) }).safeParse(req.body);
      if (!body.success) return reply.code(400).send({ error: 'Enter an amount and a reason.' });
      const { amount, reason } = body.data;
      // big grants need a super admin (stand-in for the two-person approval in the design)
      if (Math.abs(amount) > 50_000 && req.admin!.role !== 'super') return reply.code(403).send({ error: 'Changes over 50,000 chips need a super admin.' });
      try {
        const chips = await moveChips(id, amount, amount > 0 ? 'admin_grant' : 'admin_remove', { note: reason, adminId: req.admin!.sub });
        await pushWallet(id);
        return { chips };
      } catch (e) {
        if (e instanceof InsufficientChips) return reply.code(409).send({ error: 'The player does not have that many chips.' });
        throw e;
      }
    });

    // ---------- game settings ----------
    r.get('/api/admin/config', async () => ({ config: getConfig(), ...getConfigMeta() }));
    r.put('/api/admin/config', canEdit, async (req, reply) => {
      const parsed = configSchema.safeParse(req.body);
      if (!parsed.success) return reply.code(400).send({ error: 'Some settings are out of range.', issues: parsed.error.issues });
      const config = await saveConfig(parsed.data, req.admin!.name);
      return { config, ...getConfigMeta() };
    });

    // ---------- live tables ----------
    r.get('/api/admin/tables', async () => {
      const tables = liveTables().map((t) => t.adminView()).sort((a, b) => b.createdAt - a.createdAt);
      const waiting = tables.filter((t) => t.phase === 'waiting');
      return {
        tables,
        running: tables.filter((t) => t.phase !== 'ended').length,
        seated: tables.filter((t) => t.phase !== 'ended').reduce((s, t) => s + t.humans, 0),
        stuck: tables.filter((t) => t.status === 'stuck').length,
        avgWaitSecs: waiting.length ? Math.round(waiting.reduce((s, t) => s + (Date.now() - t.createdAt), 0) / waiting.length / 1000) : 0,
      };
    });
    r.post('/api/admin/tables/:id/cancel', canEdit, async (req, reply) => (cancelTable((req.params as { id: string }).id) ? { ok: true } : reply.code(404).send({ error: 'Table not running.' })));
    r.post('/api/admin/tables/:id/skip', canEdit, async (req, reply) => (skipTurn((req.params as { id: string }).id) ? { ok: true } : reply.code(404).send({ error: 'Table not running.' })));
    r.post('/api/admin/tables/:id/message', async (req, reply) => {
      const { text } = z.object({ text: z.string().trim().min(1).max(120) }).parse(req.body);
      return messageTable((req.params as { id: string }).id, text) ? { ok: true } : reply.code(404).send({ error: 'Table not running.' });
    });

    // ---------- chips ----------
    r.get('/api/admin/chips', async () => {
      const today = startOfIstDay();
      const [[wallets], [zero], byType, log] = await Promise.all([
        db.select({ total: sum(P.chips) }).from(P),
        db.select({ n: count() }).from(P).where(lt(P.chips, 50)),
        db.select({ type: schema.chipTxs.type, total: sum(schema.chipTxs.amount) }).from(schema.chipTxs).where(gte(schema.chipTxs.createdAt, today)).groupBy(schema.chipTxs.type),
        db.select({ tx: schema.chipTxs, name: P.name, code: P.code, admin: schema.admins.name }).from(schema.chipTxs)
          .innerJoin(P, eq(P.id, schema.chipTxs.playerId)).leftJoin(schema.admins, eq(schema.admins.id, schema.chipTxs.adminId))
          .orderBy(desc(schema.chipTxs.createdAt)).limit(30),
      ]);
      const t = (k: string) => Number(byType.find((b) => b.type === k)?.total ?? 0);
      return {
        inWallets: Number(wallets.total ?? 0), zeroChips: zero.n,
        bonusToday: t('daily_bonus') + t('welcome') + t('refill'), entriesToday: -t('entry'), grantsToday: t('admin_grant') + t('admin_remove'),
        log: log.map((l) => ({ id: l.tx.id, at: l.tx.createdAt, player: l.name, code: l.code, type: l.tx.type, amount: l.tx.amount, note: l.tx.note, by: l.admin ?? (l.tx.tableCode ? 'Game' : 'System'), table: l.tx.tableCode })),
      };
    });

    // ---------- reports ----------
    r.get('/api/admin/reports', async (req) => {
      const { range } = z.object({ range: z.coerce.number().int().refine((n) => [7, 30, 90].includes(n)).default(30) }).parse(req.query);
      const series = await db.execute(sql`
        select to_char(d, 'YYYY-MM-DD') as day,
          (select count(distinct gp.player_id) from game_players gp join games g on g.id = gp.game_id where (g.ended_at at time zone 'Asia/Kolkata')::date = d)::int as players,
          (select count(*) from players p where (p.created_at at time zone 'Asia/Kolkata')::date = d)::int as signups,
          (select count(*) from games g where (g.ended_at at time zone 'Asia/Kolkata')::date = d)::int as games
        from generate_series((now() at time zone 'Asia/Kolkata')::date - ${range - 1}::int, (now() at time zone 'Asia/Kolkata')::date, interval '1 day') d`);
      const retention = await db.execute(sql`
        with cohort as (
          select id, (date_trunc('week', created_at at time zone 'Asia/Kolkata'))::date as wk, (created_at at time zone 'Asia/Kolkata')::date as d0 from players
          where created_at > now() - interval '8 weeks'),
        act as (select distinct gp.player_id, (g.ended_at at time zone 'Asia/Kolkata')::date as d from game_players gp join games g on g.id = gp.game_id)
        select to_char(wk, 'DD Mon') as week, count(*)::int as size,
          round(100.0 * count(*) filter (where exists (select 1 from act where act.player_id = cohort.id and act.d = d0 + 1)) / count(*))::int as d1,
          round(100.0 * count(*) filter (where exists (select 1 from act where act.player_id = cohort.id and act.d = d0 + 7)) / count(*))::int as d7,
          round(100.0 * count(*) filter (where exists (select 1 from act where act.player_id = cohort.id and act.d = d0 + 14)) / count(*))::int as d14,
          round(100.0 * count(*) filter (where exists (select 1 from act where act.player_id = cohort.id and act.d = d0 + 30)) / count(*))::int as d30,
          (current_date - wk) as age
        from cohort group by wk order by wk desc limit 4`);
      const hours = await db.execute(sql`
        select extract(hour from ended_at at time zone 'Asia/Kolkata')::int as hour, count(*)::int as games
        from games where ended_at > now() - (${range}::int * interval '1 day') group by 1 order by 1`);
      const top = await db.execute(sql`
        select p.name, p.code, count(*)::int as games, count(*) filter (where gp.won)::int as wins, sum(gp.chips)::int as chips,
          mode() within group (order by g.mode) as fav
        from game_players gp join games g on g.id = gp.game_id join players p on p.id = gp.player_id
        where g.ended_at > now() - (${range}::int * interval '1 day') group by p.id order by chips desc limit 5`);
      const sessions = await db.execute(sql`
        select coalesce(avg(extract(epoch from g.ended_at - g.started_at)), 0)::float as avg_secs,
          coalesce(count(*)::float / nullif(count(distinct gp.player_id), 0), 0)::float as games_per_player
        from game_players gp join games g on g.id = gp.game_id where g.ended_at > now() - (${range}::int * interval '1 day')`);
      return { range, series: series.rows, retention: retention.rows, hours: hours.rows, top: top.rows, sessions: sessions.rows[0] };
    });

    // ---------- banners ----------
    const bannerBody = z.object({
      title: z.string().trim().min(2).max(40), subtitle: z.string().trim().max(60).default(''),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#0F4A2E'), target: z.string().max(40).default('lobby'),
      status: z.enum(['live', 'scheduled', 'ended']).default('live'),
    });
    r.get('/api/admin/banners', async () => db.select().from(schema.banners).orderBy(asc(schema.banners.sort), asc(schema.banners.id)));
    r.post('/api/admin/banners', canEdit, async (req) => {
      const b = bannerBody.parse(req.body);
      const [{ max }] = await db.select({ max: sql<number>`coalesce(max(${schema.banners.sort}), 0)` }).from(schema.banners);
      const [row] = await db.insert(schema.banners).values({ ...b, sort: Number(max) + 1 }).returning();
      return row;
    });
    r.patch('/api/admin/banners/:id', canEdit, async (req) => {
      const [row] = await db.update(schema.banners).set(bannerBody.partial().parse(req.body)).where(eq(schema.banners.id, Number((req.params as { id: string }).id))).returning();
      return row;
    });
    r.delete('/api/admin/banners/:id', canEdit, async (req) => {
      await db.delete(schema.banners).where(eq(schema.banners.id, Number((req.params as { id: string }).id)));
      return { ok: true };
    });
    r.post('/api/admin/banners/reorder', canEdit, async (req) => {
      const { ids } = z.object({ ids: z.array(z.number().int()) }).parse(req.body);
      await Promise.all(ids.map((id, i) => db.update(schema.banners).set({ sort: i }).where(eq(schema.banners.id, id))));
      return { ok: true };
    });

    // ---------- push ----------
    const audiences = {
      all: undefined,
      inactive7: lt(P.lastActiveAt, dayAgo(7)),
      new7: gte(P.createdAt, dayAgo(7)),
      zero: lt(P.chips, 50),
    } as const;
    r.get('/api/admin/push', async () => {
      const counts = Object.fromEntries(await Promise.all(Object.entries(audiences).map(async ([k, w]) => {
        const [c] = await db.select({ n: count() }).from(P).where(w);
        return [k, c.n];
      })));
      const history = await db.select().from(schema.pushMessages).orderBy(desc(schema.pushMessages.sentAt)).limit(20);
      return { counts, history };
    });
    r.post('/api/admin/push', canEdit, async (req, reply) => {
      const body = z.object({ title: z.string().trim().min(2).max(40), body: z.string().trim().min(2).max(120), audience: z.enum(['all', 'inactive7', 'new7', 'zero']) }).safeParse(req.body);
      if (!body.success) return reply.code(400).send({ error: 'Add a title (40 max) and message (120 max).' });
      const where = and(audiences[body.data.audience], eq(P.status, 'active'), sql`${P.pushToken} is not null`);
      const tokens = (await db.select({ t: P.pushToken }).from(P).where(where)).map((x) => x.t!);
      const delivered = await sendPush(tokens, body.data.title, body.data.body);
      const [row] = await db.insert(schema.pushMessages).values({ ...body.data, delivered, adminId: req.admin!.sub }).returning();
      return row;
    });

    // ---------- support ----------
    r.get('/api/admin/tickets', async (req) => {
      const q = z.object({ kind: z.enum(['ticket', 'report']).default('ticket'), status: z.enum(['open', 'solved', 'all']).default('open') }).parse(req.query);
      const rows = await db.select({ t: schema.tickets, name: P.name, code: P.code, color: P.color }).from(schema.tickets)
        .innerJoin(P, eq(P.id, schema.tickets.playerId))
        .where(and(eq(schema.tickets.kind, q.kind), q.status === 'all' ? undefined : eq(schema.tickets.status, q.status)))
        .orderBy(desc(schema.tickets.urgent), desc(schema.tickets.createdAt)).limit(50);
      const ids = rows.map((r2) => r2.t.id);
      const first = ids.length ? await db.query.ticketMessages.findMany({ where: inArray(schema.ticketMessages.ticketId, ids), orderBy: asc(schema.ticketMessages.createdAt) }) : [];
      const [[openT], [openR]] = await Promise.all([
        db.select({ n: count() }).from(schema.tickets).where(and(eq(schema.tickets.kind, 'ticket'), eq(schema.tickets.status, 'open'))),
        db.select({ n: count() }).from(schema.tickets).where(and(eq(schema.tickets.kind, 'report'), eq(schema.tickets.status, 'open'))),
      ]);
      return {
        counts: { tickets: openT.n, reports: openR.n },
        rows: rows.map((x) => ({ ...x.t, player: { name: x.name, code: x.code, color: x.color }, preview: first.find((m) => m.ticketId === x.t.id)?.body ?? '' })),
      };
    });
    r.get('/api/admin/tickets/:id', async (req, reply) => {
      const id = Number((req.params as { id: string }).id);
      const t = await db.query.tickets.findFirst({ where: eq(schema.tickets.id, id) });
      if (!t) return reply.code(404).send({ error: 'Ticket not found.' });
      const [player, against, messages] = await Promise.all([
        db.query.players.findFirst({ where: eq(P.id, t.playerId) }),
        t.againstPlayerId ? db.query.players.findFirst({ where: eq(P.id, t.againstPlayerId) }) : Promise.resolve(undefined),
        db.select({ m: schema.ticketMessages, admin: schema.admins.name }).from(schema.ticketMessages)
          .leftJoin(schema.admins, eq(schema.admins.id, schema.ticketMessages.fromAdminId)).where(eq(schema.ticketMessages.ticketId, id)).orderBy(asc(schema.ticketMessages.createdAt)),
      ]);
      let together: number | null = null;
      if (against) {
        const res = await db.execute(sql`select count(*)::int as n from game_players a join game_players b on a.game_id = b.game_id
          where a.player_id = ${t.playerId} and b.player_id = ${against.id}`);
        together = Number((res.rows[0] as { n: number }).n);
      }
      return {
        ...t, player: player && playerRow(player), against: against && playerRow(against), together,
        messages: messages.map((x) => ({ id: x.m.id, body: x.m.body, at: x.m.createdAt, admin: x.admin })),
      };
    });
    r.post('/api/admin/tickets/:id/reply', async (req) => {
      const id = Number((req.params as { id: string }).id);
      const { body } = z.object({ body: z.string().trim().min(1).max(2000) }).parse(req.body);
      await db.insert(schema.ticketMessages).values({ ticketId: id, body, fromAdminId: req.admin!.sub });
      await db.update(schema.tickets).set({ updatedAt: new Date() }).where(eq(schema.tickets.id, id));
      return { ok: true };
    });
    r.post('/api/admin/tickets/:id/status', async (req) => {
      const id = Number((req.params as { id: string }).id);
      const { status } = z.object({ status: z.enum(['open', 'solved']) }).parse(req.body);
      await db.update(schema.tickets).set({ status, updatedAt: new Date() }).where(eq(schema.tickets.id, id));
      return { ok: true };
    });

    // ---------- admin accounts ----------
    r.get('/api/admin/admins', superOnly, async () => db.select({ id: schema.admins.id, email: schema.admins.email, name: schema.admins.name, role: schema.admins.role, createdAt: schema.admins.createdAt }).from(schema.admins));
    r.post('/api/admin/admins', superOnly, async (req, reply) => {
      const body = z.object({ email: z.string().email(), name: z.string().trim().min(2).max(40), password: z.string().min(10), role: z.enum(['super', 'moderator', 'support']) }).safeParse(req.body);
      if (!body.success) return reply.code(400).send({ error: 'Email, name, a 10+ character password and a role are required.' });
      const exists = await db.query.admins.findFirst({ where: eq(schema.admins.email, body.data.email.toLowerCase()) });
      if (exists) return reply.code(409).send({ error: 'That email already has an admin account.' });
      const [a] = await db.insert(schema.admins).values({ email: body.data.email.toLowerCase(), name: body.data.name, role: body.data.role, passwordHash: await bcrypt.hash(body.data.password, 12) }).returning({ id: schema.admins.id });
      return a;
    });
  });
}
