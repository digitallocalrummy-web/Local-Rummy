import { Server } from 'socket.io';
import { buildApp } from './app';
import { loadConfig } from './config';
import { pool } from './db';
import { env } from './env';
import { attachSockets, refundOrphanedEntries } from './game/manager';
import { runMigrations } from './migrate';

async function main() {
  await runMigrations();
  await loadConfig();
  await refundOrphanedEntries();
  const app = await buildApp();
  const io = new Server(app.server, { cors: { origin: true }, pingInterval: 10_000, pingTimeout: 8_000 });
  attachSockets(io);
  await app.listen({ port: env.PORT, host: env.HOST });
  console.log(`Local Rummy server on http://${env.HOST}:${env.PORT}`);
  const stop = async () => { io.close(); await app.close(); await pool.end(); process.exit(0); };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

main().catch((e) => { console.error(e); process.exit(1); });
