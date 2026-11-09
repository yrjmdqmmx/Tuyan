import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const require = createRequire(new URL('../../apps/paperbanana-api/package.json', import.meta.url))
const catalogUrls = new Set([
  'https://openrouter.ai/api/v1/models',
  'https://openrouter.ai/api/v1/images/models',
  'https://tokendance.space/gateway/v1/models',
])

// Run the current Core's catalogue normalizer without starting jobs, storage,
// authentication or a second implementation of provider capabilities.
export async function createLiveModelRegistry({ fetcher = fetch, publicCheckpoint } = {}) {
  const { build } = require('esbuild')
  const result = await build({
    stdin: {
      contents: "export { modelRegistry, configureRuntimeFetch, readAccountModelCatalog, restorePublicCatalogCheckpoint, publicCatalogCheckpoint } from './apps/paperbanana-api/runtime/handler.ts'; export { isCatalogRequestAllowed } from './packages/api/src/provider-catalog.ts'",
      resolveDir: fileURLToPath(new URL('../../', import.meta.url)),
    },
    bundle: true, format: 'esm', platform: 'node', write: false,
    nodePaths: [fileURLToPath(new URL('../../apps/paperbanana-api/node_modules', import.meta.url))],
    plugins: [{ name: 'catalog-only-services', setup(builder) {
      builder.onResolve({ filter: /core-services\.(?:js|ts)$/ }, () => ({ path: 'services', namespace: 'catalog-only' }))
      builder.onLoad({ filter: /.*/, namespace: 'catalog-only' }, () => ({ loader: 'js', contents: `
        const unavailable = () => { throw new Error('Catalogue service has no database or object storage') }
        export const database = { collection: () => new Proxy({}, { get: () => unavailable }) }
        export const objectStorage = { bucket: unavailable }
      ` }))
      builder.onResolve({ filter: /^sharp$/ }, () => ({ path: pathToFileURL(require.resolve('sharp')).href, external: true }))
    } }],
  })
  const core = await import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'))
  core.configureRuntimeFetch(async (input, init = {}) => {
    const url = String(input)
    if (!(catalogUrls.has(url) && String(init.method || 'GET').toUpperCase() === 'GET') && !core.isCatalogRequestAllowed(url, init)) {
      throw new Error('Only verified read-only catalog endpoints are allowed')
    }
    const signal = init.signal
      ? AbortSignal.any([init.signal, AbortSignal.timeout(55_000)])
      : AbortSignal.timeout(55_000)
    if(catalogUrls.has(url)) return fetcher(url,{method:'GET',headers:{Accept:'application/json'},signal,redirect:'error'})
    // Fixed metadata destinations only. The reader builds the selected channel's headers.
    return fetcher(url, { ...init, method:init.method || 'GET', headers: Object.fromEntries(Object.entries(init.headers || {}).filter(([key]) => ['accept','authorization','x-api-key','api-key','x-goog-api-key','anthropic-version','content-type','host','x-date','x-content-sha256','x-security-token'].includes(key.toLowerCase()))), signal, redirect:'error' })
  })
  if(publicCheckpoint)core.restorePublicCatalogCheckpoint(publicCheckpoint)
  const read = (provider,options={}) => core.modelRegistry({ action:'modelRegistry', ...(provider ? {provider} : {}),...(options.refresh?{refreshCatalog:true}:{}) })
  read.account = payload => core.readAccountModelCatalog({...payload,action:'providerAccountCatalog',mode:'catalog'})
  read.checkpoint = () => core.publicCatalogCheckpoint()
  return read
}
