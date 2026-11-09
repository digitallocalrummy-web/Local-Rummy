import { z } from 'zod';

// Read apps/server/.env if it exists (Node 20.12+). Values already set in the environment win.
try { process.loadEnvFile('.env'); } catch { /* no .env file: use the defaults below */ }

const production = process.env.NODE_ENV === 'production';
// Local testing works with no .env at all; production must set real values.
const devDefault = (v: string) => (production ? undefined : v);

const schema = z.object({
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().min(1).default('pglite:.data/localrummy'),
  JWT_SECRET: z.string().min(8).default(devDefault('dev-only-player-secret') as string),
  ADMIN_JWT_SECRET: z.string().min(8).default(devDefault('dev-only-admin-secret') as string),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  SEED_ADMIN_EMAIL: z.string().email().optional().default(devDefault('admin@localrummy.app') as string),
  SEED_ADMIN_PASSWORD: z.string().min(8).optional().default(devDefault('change-me-now') as string),
  NODE_ENV: z.string().default('development'),
});

export const env = schema.parse(process.env);
if (production && (env.JWT_SECRET.startsWith('dev-only') || env.ADMIN_JWT_SECRET.startsWith('dev-only'))) {
  throw new Error('Set JWT_SECRET and ADMIN_JWT_SECRET in .env for production.');
}
