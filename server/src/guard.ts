/**
 * The built-in test database (PGlite) is a folder that only one program may open at a time.
 * Two servers, or db:seed while the server runs, damage it. Refuse to start in that case.
 */
import net from 'node:net';
import { env } from './env';

export async function ensureAlone(what: 'server' | 'seed') {
  if (!env.DATABASE_URL.startsWith('pglite:')) return; // PostgreSQL handles many connections itself
  const busy = await new Promise<boolean>((resolve) => {
    const s = net.createServer();
    s.once('error', (e: NodeJS.ErrnoException) => resolve(e.code === 'EADDRINUSE'));
    s.once('listening', () => s.close(() => resolve(false)));
    s.listen(env.PORT, env.HOST);
  });
  if (!busy) return;
  console.error(what === 'server'
    ? `\nAnother Local Rummy server is already running on port ${env.PORT}.\nClose that window (or run: taskkill /F /IM node.exe), then start again.\nRunning two servers at once damages the built-in test database.\n`
    : `\nThe Local Rummy server is running. Stop it with Ctrl + C, then run pnpm db:seed again.\n`);
  process.exit(1);
}
