import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { closeDb, db, usingBuiltIn } from './db';

/** Applies pending SQL migrations from ./drizzle. Runs on every server start too. */
export async function runMigrations() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const migrationsFolder = path.resolve(here, '../drizzle');
  if (usingBuiltIn) {
    const { migrate } = await import('drizzle-orm/pglite/migrator');
    await migrate(db as never, { migrationsFolder });
  } else {
    const { migrate } = await import('drizzle-orm/node-postgres/migrator');
    await migrate(db, { migrationsFolder });
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  runMigrations().then(() => { console.log('Migrations applied'); return closeDb(); });
}
