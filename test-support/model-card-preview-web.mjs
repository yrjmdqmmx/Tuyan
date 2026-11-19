// Local model-card preview only. No .env files or production API defaults.
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
const require = createRequire(new URL('../apps/web/package.json', import.meta.url))
const { createServer } = await import(require.resolve('vite'))
Object.assign(process.env, {
  VITE_API_BASE: 'http://127.0.0.1:8791', VITE_AUTH_BASE: '',
  VITE_AUTH_REQUIRED: 'false', VITE_AUTH_ENABLED: 'false',
})
const server = await createServer({
  root: fileURLToPath(new URL('../apps/web', import.meta.url)), envFile: false,
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
})
await server.listen()
server.printUrls()
