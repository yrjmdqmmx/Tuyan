import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const catalogs = [
  'apps/web/src/constants.js',
  'apps/android/src/constants.ts',
  'apps/macos/Sources/PaperBananaMac/Models/Provider.swift',
  'apps/miniprogram/miniprogram/utils/constants.ts',
  'apps/harmony/Stage/src/main/ets/constants/AppConstants.ets',
  'apps/windows/Assets/model-catalog.json',
]

const liveRegistryMetadataCatalogs = [
  'apps/ios/PaperBanana/Catalog/ProviderCatalog.swift',
]

const retiredDirectIds = [
  'gemini-3.1-pro',
  'gemini-3-flash',
  'gpt-5.5-pro',
  'gpt-5.4-pro',
  'gpt-image-1.5',
  'qwen3.7-max',
  'qwen3.7-max-2026-05-20',
  'qwen3.6-flash',
  'glm-5.1',
  'kimi-k2.6',
  'MiniMax-M2.7',
  'MiniMax/MiniMax-M2.7',
  'qwen-image-2.0-pro',
]

const currentDirectIds = [
  'gemini-3.7-flash',
  'gpt-5.6-sol',
  'gpt-image-2',
  'qwen3.8-max',
  'kimi/kimi-k3',
  'MiniMax/MiniMax-M3',
  'qwen-image-3.0-pro',
]

const retiredOpenRouterIds = [
  'openrouter/openai/gpt-5.3-chat',
]

function hasExactLiteral(source, value) {
  return source.includes(`'${value}'`) || source.includes(`"${value}"`)
}

test('every shipped client catalog submits only current direct-provider IDs', () => {
  for (const relative of catalogs) {
    const source = fs.readFileSync(path.join(root, relative), 'utf8')
    for (const retired of retiredDirectIds) {
      assert.equal(hasExactLiteral(source, retired), false, `${relative} still publishes ${retired}`)
    }
    for (const current of currentDirectIds) {
      assert.equal(hasExactLiteral(source, current), true, `${relative} is missing ${current}`)
    }
    for (const retired of retiredOpenRouterIds) {
      assert.equal(hasExactLiteral(source, retired), false, `${relative} still publishes ${retired}`)
    }
  }
})

test('live-registry clients keep local metadata free of model IDs', () => {
  for (const relative of liveRegistryMetadataCatalogs) {
    const source = fs.readFileSync(path.join(root, relative), 'utf8')
    assert.match(source, /capabilities are owned exclusively by the live server registry/)
    for (const id of [...retiredDirectIds, ...currentDirectIds, ...retiredOpenRouterIds]) {
      assert.equal(hasExactLiteral(source, id), false, `${relative} hard-codes live registry model ${id}`)
    }
  }
})
