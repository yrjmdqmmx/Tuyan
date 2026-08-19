import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const clients = [
  ['web', ['apps/web/src/App.jsx', 'packages/api/src/jobs.js']],
  ['ios', ['apps/ios/PaperBanana/Core/Networking/PaperBananaAPIClient.swift', 'apps/ios/PaperBanana/Core/Networking/ReferenceUploader.swift']],
  ['ios-smoke', ['apps/ios/Scripts/e2e-gateway-smoke.mjs']],
  ['miniprogram', ['apps/miniprogram/miniprogram/pages/index/index.ts']],
  ['harmony', ['apps/harmony/Stage/src/main/ets/services/ApiClient.ets', 'apps/harmony/Stage/src/main/ets/services/FileService.ets']],
]

test('every client that performs direct reference PUTs finalizes success and aborts failure', () => {
  for (const [client, relativeFiles] of clients) {
    const source = relativeFiles.map((relative) => fs.readFileSync(path.join(root, relative), 'utf8')).join('\n')
    assert.match(source, /finalizeReferenceUpload/, `${client} must finalize completed direct uploads`)
    if (client !== 'ios-smoke') {
      assert.match(source, /abortReferenceUpload/, `${client} must abort failed direct uploads`)
    }
  }
})
