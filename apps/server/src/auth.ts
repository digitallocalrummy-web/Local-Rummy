import type { FastifyReply, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import { env } from './env';

export interface PlayerToken { kind: 'player'; sub: string }
export interface AdminToken { kind: 'admin'; sub: string; role: 'super' | 'moderator' | 'support'; name: string }

export const signPlayer = (id: string) => jwt.sign({ kind: 'player', sub: id } satisfies PlayerToken, env.JWT_SECRET, { expiresIn: '180d' });
export const signAdmin = (a: Omit<AdminToken, 'kind'>) => jwt.sign({ kind: 'admin', ...a }, env.ADMIN_JWT_SECRET, { expiresIn: '12h' });

export function verifyPlayer(token: string): PlayerToken | null {
  try { const t = jwt.verify(token, env.JWT_SECRET) as PlayerToken; return t.kind === 'player' ? t : null; } catch { return null; }
}
export function verifyAdmin(token: string): AdminToken | null {
  try { const t = jwt.verify(token, env.ADMIN_JWT_SECRET) as AdminToken; return t.kind === 'admin' ? t : null; } catch { return null; }
}

const bearer = (req: FastifyRequest) => (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');

declare module 'fastify' {
  interface FastifyRequest { player?: PlayerToken; admin?: AdminToken }
}

export async function requirePlayer(req: FastifyRequest, reply: FastifyReply) {
  const t = verifyPlayer(bearer(req));
  if (!t) return reply.code(401).send({ error: 'Please sign in again.' });
  req.player = t;
}

/** Admin guard; pass the roles allowed (super is always allowed). */
export const requireAdmin = (...roles: AdminToken['role'][]) => async (req: FastifyRequest, reply: FastifyReply) => {
  const t = verifyAdmin(bearer(req));
  if (!t) return reply.code(401).send({ error: 'Admin sign-in required.' });
  if (roles.length && t.role !== 'super' && !roles.includes(t.role)) return reply.code(403).send({ error: 'Your role cannot do this.' });
  req.admin = t;
};
