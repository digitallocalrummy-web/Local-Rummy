import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(8),
  ADMIN_JWT_SECRET: z.string().min(8),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  SEED_ADMIN_EMAIL: z.string().email().optional(),
  SEED_ADMIN_PASSWORD: z.string().min(8).optional(),
  NODE_ENV: z.string().default('development'),
});

export const env = schema.parse(process.env);
