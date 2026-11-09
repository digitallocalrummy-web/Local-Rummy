/** Creates the first super admin, the default settings and starter banners. Safe to run again. */
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { loadConfig } from './config';
import { closeDb, db, schema } from './db';
import { env } from './env';
import { runMigrations } from './migrate';

async function main() {
  await runMigrations();
  await loadConfig();
  if (env.SEED_ADMIN_EMAIL && env.SEED_ADMIN_PASSWORD) {
    const email = env.SEED_ADMIN_EMAIL.toLowerCase();
    const exists = await db.query.admins.findFirst({ where: eq(schema.admins.email, email) });
    if (!exists) {
      await db.insert(schema.admins).values({ email, name: 'Super admin', role: 'super', passwordHash: await bcrypt.hash(env.SEED_ADMIN_PASSWORD, 12) });
      console.log(`Created super admin ${email}`);
    } else console.log(`Admin ${email} already exists`);
  } else console.log('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to create the first admin.');
  const banners = await db.select().from(schema.banners).limit(1);
  if (!banners.length) {
    await db.insert(schema.banners).values([
      { title: 'DOUBLE BONUS', subtitle: 'This weekend only', color: '#0F4A2E', target: 'bonus', status: 'scheduled', sort: 0 },
      { title: 'INVITE & EARN', subtitle: '1,000 chips each', color: '#1C2E5C', target: 'friends', status: 'live', sort: 1 },
      { title: 'POOL 101', subtitle: 'Now up to 6 players', color: '#7A1C2C', target: 'pool', status: 'live', sort: 2 },
    ]);
    console.log('Added starter banners');
  }
  await closeDb();
}

main().catch((e) => { console.error(e); process.exit(1); });
