// Exact historical card source bytes, captured by scripts/freeze-audit-sources.mjs.
// The gzip container only reduces storage; no source is transformed or evaluated here.
import fs from 'node:fs'
import path from 'node:path'
import { gunzipSync } from 'node:zlib'

const archives = new Map()
export function archivedText(root, commit, file) {
  const archivePath = path.join(root, 'test-support/archive/model-card-sources.json.gz')
  if (!archives.has(archivePath)) archives.set(archivePath, JSON.parse(gunzipSync(fs.readFileSync(archivePath))))
  const text = archives.get(archivePath)[commit]?.[file]
  if (typeof text !== 'string') throw new Error(`Missing frozen audit source: ${commit}:${file}; run scripts/freeze-audit-sources.mjs with full history`)
  return text
}
