import type { FastifyReply, FastifyRequest } from 'fastify';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { db, schema } from './db';
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

// Admin accounts seen recently, so every request doesn't hit the database.
const adminCache = new Map<string, { role: AdminToken['role']; name: string; at: number }>();

/**
 * Admin guard; pass the roles allowed (super is always allowed).
 * The account must still exist, and its current role is used, so a deleted admin, a changed role,
 * or a sign-in left over from another database is refused with "sign in again".
 */
export const requireAdmin = (...roles: AdminToken['role'][]) => async (req: FastifyRequest, reply: FastifyReply) => {
  const t = verifyAdmin(bearer(req));
  if (!t) return reply.code(401).send({ error: 'Admin sign-in required.' });
  let a = adminCache.get(t.sub);
  if (!a || Date.now() - a.at > 30_000) {
    const row = await db.query.admins.findFirst({ where: eq(schema.admins.id, t.sub), columns: { role: true, name: true } });
    if (!row) { adminCache.delete(t.sub); return reply.code(401).send({ error: 'Please sign in again.' }); }
    a = { role: row.role, name: row.name, at: Date.now() };
    adminCache.set(t.sub, a);
  }
  if (roles.length && a.role !== 'super' && !roles.includes(a.role)) return reply.code(403).send({ error: 'Your role cannot do this.' });
  req.admin = { ...t, role: a.role, name: a.name };
};
