import { sql } from 'drizzle-orm';
import { boolean, index, integer, jsonb, pgEnum, pgTable, serial, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const playerStatus = pgEnum('player_status', ['active', 'blocked']);
export const adminRole = pgEnum('admin_role', ['super', 'moderator', 'support']);
export const chipTxType = pgEnum('chip_tx_type', [
  'welcome', 'daily_bonus', 'refill', 'entry', 'refund', 'win', 'admin_grant', 'admin_remove',
]);
export const ticketKind = pgEnum('ticket_kind', ['ticket', 'report']);
export const ticketStatus = pgEnum('ticket_status', ['open', 'solved']);
export const bannerStatus = pgEnum('banner_status', ['live', 'scheduled', 'ended']);

export const players = pgTable('players', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** Short public id shown in the app and admin, e.g. LR-10482 */
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  color: text('color').notNull(),
  deviceId: text('device_id').unique(),
  phone: text('phone'),
  device: text('device'),
  appVersion: text('app_version'),
  pushToken: text('push_token'),
  status: playerStatus('status').notNull().default('active'),
  chips: integer('chips').notNull().default(0),
  level: integer('level').notNull().default(1),
  xp: integer('xp').notNull().default(0),
  gamesPlayed: integer('games_played').notNull().default(0),
  gamesWon: integer('games_won').notNull().default(0),
  bonusStreak: integer('bonus_streak').notNull().default(0),
  lastBonusAt: timestamp('last_bonus_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastActiveAt: timestamp('last_active_at', { withTimezone: true }).notNull().defaultNow(),
});

export const admins = pgTable('admins', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: adminRole('role').notNull().default('support'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const chipTxs = pgTable('chip_txs', {
  id: serial('id').primaryKey(),
  playerId: uuid('player_id').notNull().references(() => players.id),
  amount: integer('amount').notNull(),
  balanceAfter: integer('balance_after').notNull(),
  type: chipTxType('type').notNull(),
  note: text('note'),
  adminId: uuid('admin_id').references(() => admins.id),
  tableCode: text('table_code'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('chip_txs_player_idx').on(t.playerId), index('chip_txs_created_idx').on(t.createdAt)]);

/** One row per finished deal. `results` keeps every seat, bots included. */
export const games = pgTable('games', {
  id: serial('id').primaryKey(),
  tableCode: text('table_code').notNull(),
  mode: text('mode').notNull(),
  players: integer('players').notNull(),
  entry: integer('entry').notNull(),
  winnerName: text('winner_name'),
  winnerPlayerId: uuid('winner_player_id').references(() => players.id),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }).notNull().defaultNow(),
  endReason: text('end_reason').notNull(),
  results: jsonb('results').notNull(),
}, (t) => [index('games_ended_idx').on(t.endedAt)]);

export const gamePlayers = pgTable('game_players', {
  id: serial('id').primaryKey(),
  gameId: integer('game_id').notNull().references(() => games.id),
  playerId: uuid('player_id').notNull().references(() => players.id),
  points: integer('points').notNull(),
  chips: integer('chips').notNull(),
  won: boolean('won').notNull(),
}, (t) => [index('game_players_player_idx').on(t.playerId)]);

/** Single row (id = 1) holding the game settings JSON the app reads. */
export const appConfig = pgTable('app_config', {
  id: integer('id').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  updatedBy: text('updated_by'),
});

export const banners = pgTable('banners', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  subtitle: text('subtitle').notNull().default(''),
  color: text('color').notNull().default('#0F4A2E'),
  target: text('target').notNull().default('lobby'),
  status: bannerStatus('status').notNull().default('live'),
  sort: integer('sort').notNull().default(0),
  startsAt: timestamp('starts_at', { withTimezone: true }),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  taps: integer('taps').notNull().default(0),
  views: integer('views').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const pushMessages = pgTable('push_messages', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  audience: text('audience').notNull(),
  sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
  delivered: integer('delivered').notNull().default(0),
  adminId: uuid('admin_id').references(() => admins.id),
});

export const tickets = pgTable('tickets', {
  id: serial('id').primaryKey(),
  kind: ticketKind('kind').notNull().default('ticket'),
  playerId: uuid('player_id').notNull().references(() => players.id),
  subject: text('subject').notNull(),
  tag: text('tag').notNull().default('GENERAL'),
  urgent: boolean('urgent').notNull().default(false),
  status: ticketStatus('status').notNull().default('open'),
  againstPlayerId: uuid('against_player_id').references(() => players.id),
  tableCode: text('table_code'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
});

export const ticketMessages = pgTable('ticket_messages', {
  id: serial('id').primaryKey(),
  ticketId: integer('ticket_id').notNull().references(() => tickets.id),
  fromAdminId: uuid('from_admin_id').references(() => admins.id),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
