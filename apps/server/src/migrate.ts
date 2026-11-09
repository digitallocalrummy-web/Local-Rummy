import { migrate } from 'drizzle-orm/node-postgres/migrator';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, pool } from './db';

/** Applies pending SQL migrations from ./drizzle. Runs on every server start too. */
export async function runMigrations() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  await migrate(db, { migrationsFolder: path.resolve(here, '../drizzle') });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  runMigrations().then(() => { console.log('Migrations applied'); return pool.end(); });
}
