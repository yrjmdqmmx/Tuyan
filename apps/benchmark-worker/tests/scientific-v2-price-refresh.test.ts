import assert from 'node:assert/strict'
import test from 'node:test'

import { buildScientificV2CanonicalManifest, canonicalHash } from '@paperbanana/benchmark-core'
import {
  extractScientificV2OfficialPriceObservations,
  refreshScientificV2OfficialPriceSources,
} from '../src/scientific-v2-price-refresh.js'

async function fixedArkKreaEvidence(options: { arkHtml: string; kreaSentence: string }) {
  const image = (id: string, provider: 'ark' | 'openrouter') => ({
    id, canonicalModelId: `${provider}:${id}`, selectable: true, roles: ['image'],
    capabilities: { imageGeneration: true, imageEditMode: 'direct-edit' as const, resolutions: provider === 'ark' ? ['2K'] : ['1K'] },
  })
  const registry = { providers: {
    ark: { models: [image('doubao-seedream-5-0-pro-260628', 'ark')] },
    openrouter: { models: [image('krea/krea-2-large', 'openrouter')] },
  } }
  const canonicalManifest = buildScientificV2CanonicalManifest({ registryVersion: 'negative-price-bindings-v1', registryHash: canonicalHash(registry), registry })
  const rawByHash = new Map<string, Buffer>()
  const refreshReport = await refreshScientificV2OfficialPriceSources({
    canonicalManifest, capturedAt: '2026-08-31T05:00:00.000Z',
    persistCapture: async (capture, bytes) => { rawByHash.set(capture.bytesSha256, Buffer.from(bytes)) },
    fetchImpl: async (input) => {
      const url = String(input)
      if (url.includes('docs.volcengine.com')) return new Response(options.arkHtml, { status: 200, headers: { 'content-type': 'text/html' } })
      if (url.endsWith('/api/v1/images/models')) return Response.json({ data: [{ id: 'krea/krea-2-large' }] })
      if (url.endsWith('/krea/krea-2-large/endpoints')) return Response.json({ data: { id: 'krea/krea-2-large', endpoints: [{ provider_name: 'Krea', pricing: { image_output: '0.00001' } }] } })
      if (url === 'https://openrouter.ai/krea/krea-2-large') return new Response(options.kreaSentence, { status: 200, headers: { 'content-type': 'text/html' } })
      if (url.includes('ecb.europa.eu')) return new Response(`<Cube time='2026-08-31'><Cube currency='USD' rate='1.2'/><Cube currency='CNY' rate='7.2'/></Cube>`, { status: 200, headers: { 'content-type': 'application/xml' } })
      throw new Error(`unexpected URL ${url}`)
    },
  })
  return { canonicalManifest, refreshReport, loadCaptureBytes: async (capture: { bytesSha256: string }) => rawByHash.get(capture.bytesSha256)! }
}

test('real refresh performs only public GETs, hashes exact official bytes and fail-closes unresolved routes', async () => {
  const registry = { providers: {
    bailian: { models: [{ id: 'wan-test', selectable: true, roles: ['image'], capabilities: { imageGeneration: true, imageEditMode: 'none' as const, resolutions: ['2K'] } }] },
    ark: { models: [{ id: 'doubao-test', selectable: true, roles: ['image'], capabilities: { imageGeneration: true, imageEditMode: 'none' as const, resolutions: ['2K'] } }] },
    openrouter: { models: [{ id: 'vendor/test', selectable: true, roles: ['image'], capabilities: { imageGeneration: true, imageEditMode: 'none' as const, resolutions: ['2K'] } }] },
  } }
  const canonicalManifest = buildScientificV2CanonicalManifest({ registryVersion: 'refresh-v1', registryHash: canonicalHash(registry), registry })
  const calls: Array<{ url: string; method: string | undefined; authorization: string | null }> = []
  const report = await refreshScientificV2OfficialPriceSources({
    canonicalManifest,
    capturedAt: '2026-08-31T05:00:00.000Z',
    fetchImpl: async (input, init) => {
      const url = String(input)
      const headers = new Headers(init?.headers)
      calls.push({ url, method: init?.method, authorization: headers.get('authorization') })
      return new Response(`official:${url}`, { status: 200, headers: { 'content-type': url.includes('ecb.europa.eu') ? 'application/xml' : 'application/json' } })
    },
  })
  assert.ok(calls.length >= 5)
  assert.ok(calls.every((call) => (call.method === undefined || call.method === 'GET') && call.authorization === null))
  assert.ok(report.captures.every((capture) => /^[a-f0-9]{64}$/.test(capture.bytesSha256) && capture.capturedAt === report.capturedAt))
  assert.equal(report.unresolved.length, report.requirements.length)
  assert.equal(report.refreshHash, canonicalHash(Object.fromEntries(Object.entries(report).filter(([key]) => key !== 'refreshHash'))))
  assert.equal(Object.isFrozen(report), true)
  assert.throws(() => { (report as any).resolved = true }, TypeError)
  assert.equal(report.resolved, false)
})

test('official refresh rejects oversized responses before or during bounded streaming and cancels the body', async () => {
  const canonicalManifest = buildScientificV2CanonicalManifest({ registryVersion: 'oversize-v1', registryHash: canonicalHash({ providers: { bailian: { models: [] } } }), registry: { providers: { bailian: { models: [{ id: 'wan-stream', selectable: true, roles: ['image'], capabilities: { imageGeneration: true, imageEditMode: 'none', resolutions: ['2K'] } }] } } } })
  let pulls = 0
  let cancelled = false
  const body = new ReadableStream<Uint8Array>({
    pull(controller) { pulls += 1; controller.enqueue(new Uint8Array(1024 * 1024)); },
    cancel() { cancelled = true },
  })
  await assert.rejects(refreshScientificV2OfficialPriceSources({
    canonicalManifest, capturedAt: '2026-08-31T05:00:00.000Z',
    fetchImpl: async () => new Response(body, { status: 200, headers: { 'content-type': 'text/html' } }),
  }), /SCIENTIFIC_V2_PRICE_REFRESH_BYTES_EXCEEDED/)
  assert.ok(pulls <= 6, `read ${pulls} MiB before enforcing the 4 MiB cap`)
  assert.equal(cancelled, true)

  let bodyRead = false
  let preflightCancelled = false
  await assert.rejects(refreshScientificV2OfficialPriceSources({
    canonicalManifest, capturedAt: '2026-08-31T05:00:00.000Z',
    fetchImpl: async () => ({
      ok: true,
      headers: new Headers({ 'content-length': String(4 * 1024 * 1024 + 1) }),
      body: {
        async cancel() { preflightCancelled = true },
        getReader() { bodyRead = true; throw new Error('must not read oversized body') },
      },
    } as unknown as Response),
  }), /SCIENTIFIC_V2_PRICE_REFRESH_BYTES_EXCEEDED/)
  assert.equal(bodyRead, false)
  assert.equal(preflightCancelled, true)
})

test('persists exact raw captures and resolves only fixed Ark and Krea official price evidence', async () => {
  const image = (id: string, resolutions: readonly string[]) => ({
    id, canonicalModelId: id, selectable: true, roles: ['image'],
    capabilities: { imageGeneration: true, imageEditMode: 'direct-edit' as const, resolutions },
  })
  const registry = { providers: {
    ark: { models: [
      image('doubao-seedream-5-0-pro-260628', ['2K']),
      image('doubao-seedream-5-0-260128', ['2K']),
    ] },
    openrouter: { models: [
      image('krea/krea-2-large', ['1K']),
      image('krea/krea-2-medium', ['1K']),
      image('krea/krea-2-medium-turbo', ['1K']),
    ] },
  } } as const
  const canonicalManifest = buildScientificV2CanonicalManifest({
    registryVersion: 'official-fixed-prices-v1', registryHash: canonicalHash(registry), registry,
  })
  const capturedAt = '2026-08-31T05:00:00.000Z'
  const rawByHash = new Map<string, Buffer>()
  const arkHtml = Buffer.from(`
    doubao-seedream-5-0-pro 首张输入图片免费，第2张起 0.02元；输出不超过261万像素 0.30元/张，超过261万像素 0.60元/张。
    doubao-seedream-5-0-lite 0.22元/张；doubao-seedream-4-5 0.25元/张；doubao-seedream-4-0 0.20元/张。
  `)
  const kreaPrices: Record<string, [string, string, string]> = {
    'krea/krea-2-large': ['0.06', '0.065', '0.07'],
    'krea/krea-2-medium': ['0.03', '0.035', '0.04'],
    'krea/krea-2-medium-turbo': ['0.015', '0.0175', '0.02'],
  }
  const report = await refreshScientificV2OfficialPriceSources({
    canonicalManifest, capturedAt,
    persistCapture: async (capture, bytes) => { rawByHash.set(capture.bytesSha256, Buffer.from(bytes)) },
    fetchImpl: async (input) => {
      const url = String(input)
      if (url === 'https://docs.volcengine.com/docs/82379/1544106?lang=zh') {
        return new Response(arkHtml, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } })
      }
      if (url === 'https://openrouter.ai/api/v1/images/models') {
        return Response.json({ data: Object.keys(kreaPrices).map((id) => ({ id })) })
      }
      if (url.includes('/api/v1/images/models/') && url.endsWith('/endpoints')) {
        const modelId = url.slice('https://openrouter.ai/api/v1/images/models/'.length, -'/endpoints'.length)
        return Response.json({ data: { id: modelId, endpoints: [{ provider_name: 'Krea', context_length: 65536, max_completion_tokens: 58982, pricing: { image_output: '0.00001' } }] } })
      }
      if (url.startsWith('https://openrouter.ai/krea/')) {
        const modelId = `krea/${url.split('/').at(-1)}`
        const [generation, edit, moodboard] = kreaPrices[modelId]
        return new Response(`${modelId} costs $${generation}/image for Image Output, $${edit}/image for Image Output (style references) and $${moodboard}/image for Image Output (moodboards). Up to 1 reference image. renders at 1K.`, {
          status: 200, headers: { 'content-type': 'text/html; charset=utf-8' },
        })
      }
      if (url.includes('ecb.europa.eu')) {
        return new Response(`<Cube time='2026-08-31'><Cube currency='USD' rate='1.2'/><Cube currency='CNY' rate='7.2'/></Cube>`, {
          status: 200, headers: { 'content-type': 'application/xml' },
        })
      }
      throw new Error(`unexpected URL ${url}`)
    },
  })
  assert.equal(rawByHash.size, report.captures.length)
  assert.ok(report.captures.some((capture) => capture.url === 'https://docs.volcengine.com/docs/82379/1544106?lang=zh'))
  assert.ok(report.captures.some((capture) => capture.url === 'https://openrouter.ai/krea/krea-2-large'))

  const extracted = await extractScientificV2OfficialPriceObservations({
    canonicalManifest, refreshReport: report,
    loadCaptureBytes: async (capture) => rawByHash.get(capture.bytesSha256)!,
  })
  assert.equal(extracted.resolved, true)
  assert.deepEqual(extracted.unresolved, [])
  const rates = extracted.observations.map((observation) => [observation.modelId, observation.operation, observation.charges[0].rateDecimal])
  assert.deepEqual(rates, [
    ['doubao-seedream-5-0-260128', 'edit', '0.22'],
    ['doubao-seedream-5-0-260128', 'generation', '0.22'],
    ['doubao-seedream-5-0-pro-260628', 'edit', '0.30'],
    ['doubao-seedream-5-0-pro-260628', 'generation', '0.30'],
    ['krea/krea-2-large', 'edit', '0.065'],
    ['krea/krea-2-large', 'generation', '0.06'],
    ['krea/krea-2-medium', 'edit', '0.035'],
    ['krea/krea-2-medium', 'generation', '0.03'],
    ['krea/krea-2-medium-turbo', 'edit', '0.0175'],
    ['krea/krea-2-medium-turbo', 'generation', '0.015'],
  ])
  assert.ok(extracted.observations.filter((item) => item.provider === 'openrouter')
    .every((item) => item.openRouterEvidence?.pricingPage?.url === `https://openrouter.ai/${item.modelId}`))
})

test('rejects Ark bytes that swap model prices or remove the first-input-free rule', async () => {
  const validTail = `doubao-seedream-5-0-lite 0.22元/张；doubao-seedream-4-5 0.25元/张；doubao-seedream-4-0 0.20元/张。`
  const krea = `krea/krea-2-large costs $0.06/image for Image Output, $0.065/image for Image Output (style references) and $0.07/image for Image Output (moodboards). Up to 1 reference image. renders at 1K.`
  const swapped = await fixedArkKreaEvidence({
    arkHtml: `doubao-seedream-5-0-pro 首张输入图片免费，第2张起 0.02元；输出不超过261万像素 0.60元/张，超过261万像素 0.30元/张。${validTail}`,
    kreaSentence: krea,
  })
  await assert.rejects(extractScientificV2OfficialPriceObservations(swapped), /SCIENTIFIC_V2_ARK_PRICE_EVIDENCE_INVALID/)

  const chargedFirst = await fixedArkKreaEvidence({
    arkHtml: `doubao-seedream-5-0-pro 第1张输入图片起 0.02元；输出不超过261万像素 0.30元/张，超过261万像素 0.60元/张。${validTail}`,
    kreaSentence: krea,
  })
  await assert.rejects(extractScientificV2OfficialPriceObservations(chargedFirst), /SCIENTIFIC_V2_ARK_PRICE_EVIDENCE_INVALID/)
})

test('accepts the current Ark table wording and punctuation without weakening bound prices', async () => {
  const input = await fixedArkKreaEvidence({
    arkHtml: `目录 doubao-seedream-5-0-pro doubao-seedream-5-0-lite doubao-seedream-4-5 doubao-seedream-4-0
      doubao-seedream-5-0-pro 按生图场景区分定价 首张免费 第 2 张起：0.02
      单图生成场景：≤ 261 万像素（分辨率 1.5K 及以下）：0.30；> 261 万像素（分辨率 1.5K 以上）：0.60。
      doubao-seedream-5-0-lite 免费 0.22 doubao-seedream-4-5 免费 0.25 doubao-seedream-4-0 免费 0.20`,
    kreaSentence: `krea/krea-2-large costs $0.06/image for Image Output, $0.065/image for Image Output (style references) and $0.07/image for Image Output (moodboards). Up to 1 reference image. renders at 1K.`,
  })
  const extracted = await extractScientificV2OfficialPriceObservations(input)
  assert.equal(extracted.observations.filter((item) => item.provider === 'ark').length, 2)
  assert.equal(extracted.unresolved.length, 0)
})

test('rejects Krea bytes that exchange generation and style-reference prices', async () => {
  const input = await fixedArkKreaEvidence({
    arkHtml: `doubao-seedream-5-0-pro 首张输入图片免费，第2张起 0.02元；输出不超过261万像素 0.30元/张，超过261万像素 0.60元/张。
      doubao-seedream-5-0-lite 0.22元/张；doubao-seedream-4-5 0.25元/张；doubao-seedream-4-0 0.20元/张。`,
    kreaSentence: `krea/krea-2-large costs $0.065/image for Image Output, $0.06/image for Image Output (style references) and $0.07/image for Image Output (moodboards). Up to 1 reference image. renders at 1K.`,
  })
  await assert.rejects(extractScientificV2OfficialPriceObservations(input), /SCIENTIFIC_V2_OPENROUTER_PRICE_EVIDENCE_INVALID/)
})
