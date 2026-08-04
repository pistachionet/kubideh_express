import { defineConfig } from 'vite';

// The dev server binds all interfaces so the game can be tested from a
// phone over Tailscale.
export default defineConfig({
  server: { host: true },
  preview: { host: true },
  build: { target: 'es2020' },
});
