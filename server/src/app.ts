import cors from '@fastify/cors';
import Fastify from 'fastify';
import { ZodError } from 'zod';
import { env } from './env';
import { adminRoutes } from './routes/admin';
import { playerRoutes } from './routes/player';

export async function buildApp() {
  const app = Fastify({ logger: { level: env.NODE_ENV === 'production' ? 'info' : 'warn' }, trustProxy: true });
  const origins = env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);
  // the mobile app sends no Origin header; browsers must be on the allow list
  await app.register(cors, { origin: (origin, cb) => cb(null, !origin || origins.includes('*') || origins.includes(origin)) });
  app.setErrorHandler((err: Error & { statusCode?: number }, _req, reply) => {
    if (err instanceof ZodError) return reply.code(400).send({ error: 'Invalid request.', issues: err.issues });
    if (err.statusCode && err.statusCode < 500) return reply.code(err.statusCode).send({ error: err.message });
    app.log.error(err);
    return reply.code(500).send({ error: 'Something went wrong. Please try again.' });
  });
  app.get('/api/health', async () => ({ ok: true, time: new Date().toISOString() }));
  await app.register(playerRoutes);
  await app.register(adminRoutes);
  return app;
}
