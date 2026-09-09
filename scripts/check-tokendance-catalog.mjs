// Public discovery never enables unreviewed capabilities or silently rewrites IDs.
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
export function compareTokenDanceCatalog(approved, live) {
  if (!Array.isArray(live?.data) || live.data.some(m => typeof m.id !== 'string' || !Array.isArray(m.supported_protocols))) throw new Error('Invalid TokenDance catalog')
  const ids = new Set()
  for (const model of live.data) { if (ids.has(model.id)) throw new Error('Duplicate TokenDance model ID: ' + model.id); ids.add(model.id) }
  const old = new Map(approved.models.map(m => [m.id, m])), next = new Map(live.data.map(m => [m.id, m]))
  const protocols = m => [...m.supported_protocols].sort().join(',')
  return {
    newModels: live.data.filter(m => !old.has(m.id)).map(m => m.id).sort(),
    retiredModels: approved.models.filter(m => !next.has(m.id)).map(m => m.id).sort(),
    protocolChanges: live.data.filter(m => old.has(m.id) && protocols(m) !== protocols(old.get(m.id))).map(m => m.id).sort(),
    metadataReview: live.data.filter(m => old.has(m.id) && (m.description !== old.get(m.id).description || m.context_length !== old.get(m.id).context_length)).map(m => m.id).sort(),
    liveCount: live.data.length,
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = new URL('../', import.meta.url)
  const approved = JSON.parse(await fs.readFile(new URL('config/tokendance/catalog.json', root), 'utf8'))
  const file = process.argv.indexOf('--file')
  const live = file >= 0 ? JSON.parse(await fs.readFile(process.argv[file + 1], 'utf8')) : await (await fetch(approved.apiSource, { signal: AbortSignal.timeout(15000), headers: { 'X-App-URL': approved.appUrl } })).json()
  const diff = compareTokenDanceCatalog(approved, live)
  console.log(JSON.stringify({ checkedAt: new Date().toISOString(), ...diff }, null, 2))
  if (Object.entries(diff).some(([key, value]) => key !== 'liveCount' && value.length)) process.exitCode = 2
}
