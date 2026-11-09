/**
 * Database connection.
 *  - DATABASE_URL=postgres://…  → real PostgreSQL (use this on the VPS)
 *  - DATABASE_URL=pglite:<dir>  → built-in PostgreSQL that runs inside Node, saved in <dir>.
 *    Nothing to install; meant for testing on your own computer.
 */
import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePg, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { drizzle as drizzleLite } from 'drizzle-orm/pglite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { env } from '../env';
import * as schema from './schema';

export const usingBuiltIn = env.DATABASE_URL.startsWith('pglite:');

let closer: () => Promise<void>;
let instance: NodePgDatabase<typeof schema>;

if (usingBuiltIn) {
  const dir = path.resolve(env.DATABASE_URL.slice('pglite:'.length) || '.data/localrummy');
  mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir);
  // same query API as node-postgres for everything this server uses
  instance = drizzleLite(client, { schema }) as unknown as NodePgDatabase<typeof schema>;
  closer = () => client.close();
} else {
  const pool = new pg.Pool({ connectionString: env.DATABASE_URL, max: 10 });
  instance = drizzlePg(pool, { schema });
  closer = () => pool.end();
}

export const db = instance;
export type Db = typeof db;
export const closeDb = () => closer();
export { schema };
