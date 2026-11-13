// Make sure the server isn't holding the test database, then seed it.
import { ensureAlone } from './guard';

await ensureAlone('seed');
await import('./seed-main');
