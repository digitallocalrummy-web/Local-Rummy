import { eq } from 'drizzle-orm';
import { EventEmitter } from 'node:events';
import { z } from 'zod';
import { db, schema } from './db';

const modeSchema = z.object({
  enabled: z.boolean(),
  maxPlayers: z.number().int().min(1).max(10),
  entries: z.array(z.number().int().min(0).max(1_000_000)).min(1).max(5),
});

/** Everything the admin "Game setup" and "Chips & rewards" screens control. */
export const configSchema = z.object({
  modes: z.object({ points: modeSchema, pool: modeSchema, deals: modeSchema }),
  turnSeconds: z.number().int().min(10).max(120),
  autoDropAfter: z.number().int().min(1).max(10),
  drops: z.object({ first: z.number().int().min(0).max(80), middle: z.number().int().min(0).max(80), full: z.number().int().min(0).max(80) }),
  printedJokers: z.boolean(),
  quickChat: z.boolean(),
  maintenance: z.boolean(),
  minAppVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  bonus: z.object({ day1: z.number().int().min(0).max(100_000), multipliers: z.array(z.number().min(0).max(20)).length(7) }),
  refill: z.number().int().min(0).max(100_000),
  welcome: z.number().int().min(0).max(1_000_000),
  botFillSeconds: z.number().int().min(0).max(120),
});
export type GameConfig = z.infer<typeof configSchema>;
export type ModeId = keyof GameConfig['modes'];
export const MODE_IDS: ModeId[] = ['points', 'pool', 'deals'];

export const defaultConfig: GameConfig = {
  modes: {
    points: { enabled: true, maxPlayers: 10, entries: [50, 200, 500] },
    pool: { enabled: true, maxPlayers: 6, entries: [100, 500, 1000] },
    deals: { enabled: true, maxPlayers: 6, entries: [50, 100, 300] },
  },
  turnSeconds: 30,
  autoDropAfter: 3,
  drops: { first: 20, middle: 40, full: 80 },
  printedJokers: true,
  quickChat: true,
  maintenance: false,
  minAppVersion: '1.0.0',
  bonus: { day1: 1000, multipliers: [1, 1.2, 1.3, 1.5, 1.8, 2, 3] },
  refill: 500,
  welcome: 2000,
  botFillSeconds: 4,
};

let current: GameConfig = defaultConfig;
let meta = { updatedAt: new Date(0), updatedBy: null as string | null };
/** Emits 'change' with the new config whenever an admin publishes. */
export const configEvents = new EventEmitter();

export async function loadConfig() {
  const row = await db.query.appConfig.findFirst({ where: eq(schema.appConfig.id, 1) });
  if (!row) {
    await db.insert(schema.appConfig).values({ id: 1, value: defaultConfig, updatedBy: 'system' });
    current = defaultConfig;
  } else {
    // merge so new settings added in later versions get their defaults
    current = configSchema.parse({ ...defaultConfig, ...(row.value as object) });
    meta = { updatedAt: row.updatedAt, updatedBy: row.updatedBy };
  }
  return current;
}

export const getConfig = () => current;
export const getConfigMeta = () => meta;

export async function saveConfig(next: GameConfig, by: string) {
  const value = configSchema.parse(next);
  const updatedAt = new Date();
  await db.update(schema.appConfig).set({ value, updatedAt, updatedBy: by }).where(eq(schema.appConfig.id, 1));
  current = value;
  meta = { updatedAt, updatedBy: by };
  configEvents.emit('change', value);
  return value;
}

/** The part of the config the mobile app needs. */
export function publicConfig(c = current) {
  return {
    modes: c.modes,
    turnSeconds: c.turnSeconds,
    printedJokers: c.printedJokers,
    quickChat: c.quickChat,
    maintenance: c.maintenance,
    minAppVersion: c.minAppVersion,
    bonus: c.bonus,
    updatedAt: meta.updatedAt.toISOString(),
  };
}
