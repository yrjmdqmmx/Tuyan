import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function source(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
}

const webJobs = source('packages/api/src/jobs.js')
assert.match(webJobs, /const CLIENT_PLATFORM = 'web'/)
assert.match(webJobs, /clientPlatform: CLIENT_PLATFORM/)

const miniprogramPayload = source('apps/miniprogram/miniprogram/utils/payload.ts')
const miniprogramRecords = source('apps/miniprogram/miniprogram/pages/records/records.wxml')
assert.match(miniprogramPayload, /clientPlatform: 'miniprogram'/)
assert.match(miniprogramRecords, /history-meta[^\n]*client_platform_text/)

const laf = source('apps/laf-functions/paperbanana-api.ts')
assert.match(laf, /type ClientPlatform = 'web' \| 'miniprogram' \| 'android' \| 'ios' \| 'windows' \| 'macos' \| 'harmony'/)
assert.match(laf, /clientPlatform:\s*normalizeClientPlatform\(body\.clientPlatform\)/)
assert.match(laf, /const clientPlatform = normalizeClientPlatform\(job\.clientPlatform\) \|\| normalizeClientPlatform\(job\.client_platform\)/)
assert.match(laf, /clientPlatform,\s*client_platform:\s*clientPlatform/)
assert.match(laf, /Invalid clientPlatform/)

console.log('client-platform-source-contract.test.mjs passed')
