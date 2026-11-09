import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// In development the API runs on :4000; in production Nginx serves both from one domain.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: process.env.ADMIN_BASE ?? '/',
  server: { port: 5173, host: true, proxy: { '/api': 'http://127.0.0.1:4000' } },
});
