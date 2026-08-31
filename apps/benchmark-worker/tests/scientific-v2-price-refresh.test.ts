import assert from 'node:assert/strict'
import test from 'node:test'

import { buildScientificV2CanonicalManifest, canonicalHash } from '@paperbanana/benchmark-core'
import { refreshScientificV2OfficialPriceSources } from '../src/scientific-v2-price-refresh.js'

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
