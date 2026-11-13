// Make sure no other copy has the test database open, then start the server.
import { ensureAlone } from './guard';

await ensureAlone('server');
await import('./server');
