import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Frontend for the auth entity. Talks to the auth HTTP API (src/auth/server.ts)
// via the /api proxy — the browser can't use node:sqlite/node:crypto directly.
export default defineConfig({
  root: 'src/auth/web',
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // Regex so it matches /api/* calls but NOT the /api.ts module path.
      '^/api/': 'http://localhost:8787',
    },
  },
  build: {
    outDir: '../../../dist/auth-web',
    emptyOutDir: true,
  },
})
