import { defineConfig } from 'tsup';

// Production build for the VPS: dist/index.js (server) and dist/seed.js.
export default defineConfig({
  entry: ['src/index.ts', 'src/seed.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  outDir: 'dist',
  clean: true,
  // the shared rummy rules are TypeScript source in the workspace: bundle them in
  noExternal: ['@local-rummy/rummy'],
});
