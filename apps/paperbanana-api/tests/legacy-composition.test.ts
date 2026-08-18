import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { build } from 'esbuild'

type LegacyPolicyModule = {
  default(ctx: Record<string, any>): Promise<any>
  toCreateExecutionBody(body: Record<string, unknown>): Record<string, unknown>
  toRefineExecutionBody(body: Record<string, unknown>): Record<string, unknown>
  saveResult(jobId: string, candidateId: number, content: string, mimeType: string, encoding: 'base64' | 'utf8'): Promise<any>
  saveStageImage(jobId: string, candidateId: number, stage: string, content: string, mimeType: string, encoding: 'base64' | 'utf8'): Promise<any>
  createJobAdmissionController(config: Record<string, number>, dependencies: Record<string, unknown>): any
  configureJobAdmission(config: Record<string, number>): void
  getJobAdmissionState(): Record<string, unknown>
  stopJobAdmission(): void
  drainJobAdmission(): Promise<void>
  readResponseWithLimit(response: Response, maxBytes: number, label: string): Promise<Buffer>
  parseBoundedModelResponse(response: Response, maxBytes: number, label: string): Promise<any>
  validateProviderImageBase64(value: string, maxBytes: number, label: string): string
  readStoredObject(bucket: Record<string, any>, key: string, maxBytes: number, label: string): Promise<Buffer>
  verifyUploadedReferenceObjects(images: Array<Record<string, unknown>>, bucket?: Record<string, unknown>): Promise<void>
  configureRuntimeFetch(fetchImpl?: typeof fetch): void
  fetchWithRetry(url: string, options: RequestInit | undefined, label: string, attempts?: number): Promise<Response>
}

test('legacy Laf defaults to global fetch and supports a Node-injected runtime fetch without importing Undici', async () => {
  const legacy = await loadLegacy()
  const previousFetch = globalThis.fetch
  const calls: string[] = []
  try {
    legacy.configureRuntimeFetch()
    globalThis.fetch = async (input) => {
      calls.push(`global:${String(input)}`)
      return new Response('{}')
    }
    await legacy.fetchWithRetry('https://example.com/global', undefined, 'global', 1)

    legacy.configureRuntimeFetch(async (input) => {
      calls.push(`injected:${String(input)}`)
      return new Response('{}')
    })
    await legacy.fetchWithRetry('https://example.com/injected', undefined, 'injected', 1)
  } finally {
    legacy.configureRuntimeFetch()
    globalThis.fetch = previousFetch
  }

  assert.deepEqual(calls, [
    'global:https://example.com/global',
    'injected:https://example.com/injected',
  ])
  assert.doesNotMatch(fs.readFileSync(legacyPath, 'utf8'), /from\s+['"]undici['"]|require\(['"]undici['"]\)/)
})

test('legacy bounded retries preserve the stable provider egress error', async () => {
  const legacy = await loadLegacy()
  let attempts = 0
  legacy.configureRuntimeFetch(async () => {
    attempts += 1
    const error: any = new Error('海外模型出口暂不可用，请稍后重试。')
    error.code = 'PROVIDER_EGRESS_UNAVAILABLE'
    throw error
  })
  try {
    await assert.rejects(
      legacy.fetchWithRetry('https://api.openai.com/v1/models', undefined, 'OpenAI secret label', 2),
      (error: any) => {
        assert.equal(error.message, '海外模型出口暂不可用，请稍后重试。')
        assert.equal(error.code, 'PROVIDER_EGRESS_UNAVAILABLE')
        return true
      },
    )
  } finally {
    legacy.configureRuntimeFetch()
  }
  assert.equal(attempts, 2)
})

test('OpenRouter model catalog failures expose only the stable provider egress message', async () => {
  const legacy = await loadLegacy()
  legacy.configureRuntimeFetch(async () => {
    const error: any = new Error('海外模型出口暂不可用，请稍后重试。')
    error.code = 'PROVIDER_EGRESS_UNAVAILABLE'
    throw error
  })
  try {
    const result = await legacy.default({
      request: { method: 'POST' },
      body: { action: 'modelCapability', provider: 'openrouter', model: 'openai/gpt-5' },
      headers: {},
      response: { setHeader() {}, status() {} },
    })
    assert.equal(result.code, 0)
    assert.equal(result.reason, '海外模型出口暂不可用，请稍后重试。')
    assert.doesNotMatch(JSON.stringify(result), /OpenRouter metadata unavailable|openai\/gpt-5/)
  } finally {
    legacy.configureRuntimeFetch()
  }
})

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const legacyPath = path.resolve(packageRoot, '../laf-functions/paperbanana-api.ts')
const legacyBridgePath = path.resolve(packageRoot, 'src/legacy-entry.mjs')

let legacyPromise: Promise<LegacyPolicyModule> | undefined

async function loadLegacy(): Promise<LegacyPolicyModule> {
  if (!legacyPromise) {
    legacyPromise = (async () => {
      const result = await build({
        entryPoints: [legacyBridgePath],
        bundle: true,
        format: 'esm',
        platform: 'node',
        write: false,
        external: ['@resvg/resvg-wasm'],
        plugins: [{
          name: 'fake-laf-cloud',
          setup(builder) {
            builder.onResolve({ filter: /^@lafjs\/cloud$/ }, () => ({ path: 'fake-laf-cloud', namespace: 'fake' }))
            builder.onLoad({ filter: /.*/, namespace: 'fake' }, () => ({
              loader: 'js',
              contents: `
                const state = globalThis.__paperbananaLegacyTestState ||= { inserts: [] };
                const collection = {
                  find() { return { sort() { return this }, limit() { return this }, async toArray() { return [] } } },
                  async findOne() { return null },
                  async insertOne(document) { state.inserts.push(document) },
                  async updateOne() {}, async deleteMany() { return { deletedCount: 0 } }
                };
                const bucket = {
                  async writeFile() { throw new Error('OSS write failed') },
                  async getDownloadUrl() { return 'https://signed.invalid/object' },
                  async getUploadUrl() { return 'https://signed.invalid/upload' },
                  async listFiles() { return { Contents: [], IsTruncated: false } },
                  async deleteFile() {}
                };
                export default { mongo: { db: { collection() { return collection } } }, storage: { bucket() { return bucket } } };
              `,
            }))
          },
        }],
      })
      const source = result.outputFiles[0].text
      return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`) as Promise<LegacyPolicyModule>
    })()
  }
  return legacyPromise
}

test('create background execution DTO omits the complete apiKeys map', async () => {
  const legacy = await loadLegacy()
  assert.equal(typeof legacy.toCreateExecutionBody, 'function')

  const result = legacy.toCreateExecutionBody({
    action: 'createJob',
    provider: 'gemini',
    apiKeys: { gemini: 'selected', openai: 'must-not-survive', bailian: 'must-not-survive' },
    caption: 'caption',
  })

  assert.equal(Object.hasOwn(result, 'apiKeys'), false)
  assert.deepEqual(result, { action: 'createJob', provider: 'gemini', caption: 'caption' })
})

test('refine background execution DTO omits the complete apiKeys map', async () => {
  const legacy = await loadLegacy()
  assert.equal(typeof legacy.toRefineExecutionBody, 'function')

  const result = legacy.toRefineExecutionBody({
    action: 'refineImage',
    provider: 'openai',
    apiKeys: { openai: 'selected', gemini: 'must-not-survive' },
    editInstruction: 'make labels clearer',
  })

  assert.equal(Object.hasOwn(result, 'apiKeys'), false)
  assert.deepEqual(result, { action: 'refineImage', provider: 'openai', editInstruction: 'make labels clearer' })
})

test('request handlers delegate background closures with secret-free DTOs', () => {
  const source = fs.readFileSync(legacyPath, 'utf8')
  assert.match(source, /startCreateJobInBackground\(reservation, jobId, jobBody, apiKey, safeNumCandidates, safeCriticRounds\)/)
  assert.match(source, /startRefineJobInBackground\(reservation, jobId, normalizedBody, apiKey\)/)
  const createStart = source.indexOf('async function createJob')
  const refineStart = source.indexOf('async function refineImage')
  const createSection = source.slice(createStart, refineStart)
  const refineSection = source.slice(refineStart, source.indexOf('async function getJob'))
  assert.ok(createSection.includes('await verifyUploadedReferenceObjects('))
  assert.ok(createSection.indexOf('jobAdmission.reserve(') < createSection.indexOf('await resolveReferenceImageMode('))
  assert.ok(createSection.indexOf('jobAdmission.reserve(') < createSection.indexOf('await jobs.insertOne('))
  assert.ok(createSection.indexOf('await verifyUploadedReferenceObjects(') < createSection.indexOf('await resolveReferenceImageMode('))
  assert.ok(createSection.indexOf('await verifyUploadedReferenceObjects(') < createSection.indexOf('await jobs.insertOne('))
  assert.ok(refineSection.indexOf('jobAdmission.reserve(') < refineSection.indexOf('await jobs.insertOne('))
})

test('reference upload signing binds the declared content type and length without changing the response shape', () => {
  const source = fs.readFileSync(legacyPath, 'utf8')
  const uploadStart = source.indexOf('async function prepareReferenceUpload')
  const uploadSection = source.slice(uploadStart, source.indexOf('async function modelCapability'))
  assert.match(
    uploadSection,
    /bucket\.getUploadUrl\(objectKey, referenceUploadTtlSeconds, \{\s*ContentType: descriptor\.mimeType,\s*ContentLength: descriptor\.size,\s*\}\)/,
  )
  assert.doesNotMatch(uploadSection, /uploads\.push\(\{[\s\S]*ContentLength:/)
})

test('shared handler exports global admission lifecycle hooks for Node shutdown', async () => {
  const legacy = await loadLegacy()
  assert.equal(typeof legacy.configureJobAdmission, 'function')
  assert.equal(typeof legacy.getJobAdmissionState, 'function')
  assert.equal(typeof legacy.stopJobAdmission, 'function')
  assert.equal(typeof legacy.drainJobAdmission, 'function')
})

test('standalone Laf keeps immediate background admission until Node explicitly configures limits', () => {
  const source = fs.readFileSync(legacyPath, 'utf8')
  assert.match(source, /let jobAdmission = newGlobalJobAdmission\(\{\s*maxActive: Number\.MAX_SAFE_INTEGER,\s*maxPending: 0,\s*maxPerOwner: Number\.MAX_SAFE_INTEGER,\s*maxPerIp: Number\.MAX_SAFE_INTEGER,\s*\}\)/)
})

test('job admission bounds active and FIFO pending work with stable saturation', async () => {
  const legacy = await loadLegacy()
  assert.equal(typeof legacy.createJobAdmissionController, 'function')
  const started: string[] = []
  const releases = new Map<string, () => void>()
  const controller = legacy.createJobAdmissionController(
    { maxActive: 1, maxPending: 2, maxPerOwner: 1, maxPerIp: 1 },
    {
      execute: async (task: any) => {
        started.push(task.jobId)
        await new Promise<void>((resolve) => releases.set(task.jobId, resolve))
      },
      markFailed: async () => {},
      logError: () => {},
    },
  )

  const reservations = ['job-1', 'job-2', 'job-3'].map((jobId, index) => {
    const reservation = controller.reserve({ ownerKey: `owner-${index}`, ipKey: `ip-${index}` })
    assert.equal(reservation.ok, true)
    controller.commit(reservation, { jobId, kind: 'create', body: { caption: jobId }, apiKey: `selected-${index}` })
    return reservation
  })
  const rejected = controller.reserve({ ownerKey: 'owner-4', ipKey: 'ip-4' })

  assert.deepEqual(rejected, { ok: false, code: 429, error: 'Job queue is full. Please try again later.' })
  assert.deepEqual(started, ['job-1'])
  assert.deepEqual(controller.snapshot(), {
    accepting: true,
    active: 1,
    queued: 2,
    reserved: 0,
    tracked: 1,
  })
  assert.doesNotMatch(JSON.stringify(controller.snapshot()), /selected-|caption/)

  releases.get('job-1')?.()
  await new Promise((resolve) => setImmediate(resolve))
  assert.deepEqual(started, ['job-1', 'job-2'])
  releases.get('job-2')?.()
  await new Promise((resolve) => setImmediate(resolve))
  assert.deepEqual(started, ['job-1', 'job-2', 'job-3'])
  releases.get('job-3')?.()
  await controller.drain()
  assert.deepEqual(controller.snapshot(), {
    accepting: true,
    active: 0,
    queued: 0,
    reserved: 0,
    tracked: 0,
  })
  assert.equal(reservations.length, 3)
})

test('job admission enforces owner and IP limits across active and queued work', async () => {
  const legacy = await loadLegacy()
  assert.equal(typeof legacy.createJobAdmissionController, 'function')
  const controller = legacy.createJobAdmissionController(
    { maxActive: 2, maxPending: 2, maxPerOwner: 1, maxPerIp: 1 },
    { execute: async () => new Promise(() => {}), markFailed: async () => {}, logError: () => {} },
  )

  const first = controller.reserve({ ownerKey: 'owner-a', ipKey: 'ip-a' })
  assert.equal(first.ok, true)
  assert.deepEqual(controller.reserve({ ownerKey: 'owner-a', ipKey: 'ip-b' }), {
    ok: false,
    code: 429,
    error: 'Job owner limit exceeded. Please wait for the current job to finish.',
  })
  assert.deepEqual(controller.reserve({ ownerKey: 'owner-b', ipKey: 'ip-a' }), {
    ok: false,
    code: 429,
    error: 'Job IP limit exceeded. Please wait for the current job to finish.',
  })
  controller.cancel(first)
  assert.equal(controller.reserve({ ownerKey: 'owner-a', ipKey: 'ip-a' }).ok, true)
})

test('job admission catches markFailed errors and drains without an unhandled rejection', async () => {
  const legacy = await loadLegacy()
  assert.equal(typeof legacy.createJobAdmissionController, 'function')
  const logged: string[] = []
  const controller = legacy.createJobAdmissionController(
    { maxActive: 1, maxPending: 0, maxPerOwner: 1, maxPerIp: 1 },
    {
      execute: async () => { throw new Error('generation failed') },
      markFailed: async () => { throw new Error('mongo failed') },
      logError: (message: string) => logged.push(message),
    },
  )
  const reservation = controller.reserve({ ownerKey: 'owner', ipKey: 'ip' })
  controller.commit(reservation, { jobId: 'job-fail', kind: 'refine', body: {}, apiKey: 'selected-key' })

  await controller.drain()

  assert.deepEqual(logged, ['Failed to persist terminal state for job-fail: mongo failed'])
  assert.equal(controller.snapshot().tracked, 0)
})

test('job admission stop rejects new reservations while allowing existing work to drain', async () => {
  const legacy = await loadLegacy()
  assert.equal(typeof legacy.createJobAdmissionController, 'function')
  let release!: () => void
  const controller = legacy.createJobAdmissionController(
    { maxActive: 1, maxPending: 1, maxPerOwner: 1, maxPerIp: 1 },
    {
      execute: async () => new Promise<void>((resolve) => { release = resolve }),
      markFailed: async () => {},
      logError: () => {},
    },
  )
  const reservation = controller.reserve({ ownerKey: 'owner', ipKey: 'ip' })
  controller.commit(reservation, { jobId: 'job-1', kind: 'create', body: {}, apiKey: 'selected-key' })
  controller.stop()

  assert.deepEqual(controller.reserve({ ownerKey: 'owner-2', ipKey: 'ip-2' }), {
    ok: false,
    code: 503,
    error: 'Job admission is draining. Please retry after restart.',
  })
  const draining = controller.drain()
  let drained = false
  void draining.then(() => { drained = true })
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(drained, false)
  release()
  await draining
  assert.equal(drained, true)
})

test('saturated legacy admission returns a 429 business envelope without inserting an orphan', async () => {
  const legacy = await loadLegacy()
  const testState = ((globalThis as any).__paperbananaLegacyTestState ||= { inserts: [] })
  testState.inserts.length = 0
  legacy.configureJobAdmission({ maxActive: 1, maxPending: 0, maxPerOwner: 2, maxPerIp: 2 })

  const previousGateway = process.env.PAPERBANANA_GATEWAY_TOKEN
  const previousFetch = globalThis.fetch
  process.env.PAPERBANANA_GATEWAY_TOKEN = 'test-gateway-token'
  let resolveFetch!: (response: Response) => void
  globalThis.fetch = async () => await new Promise<Response>((resolve) => { resolveFetch = resolve })
  const context = (owner: string) => ({
    request: { method: 'POST' },
    headers: { 'x-real-ip': '203.0.113.10' },
    body: {
      action: 'createJob',
      provider: 'gemini',
      apiKeys: { gemini: 'selected-key', openai: 'must-not-survive' },
      gatewayToken: 'test-gateway-token',
      userId: owner,
      methodContent: 'A sufficiently detailed method section for admission testing.',
      caption: 'Admission test',
      mainModelName: 'gemini-2.5-flash',
      imageModelName: 'gemini-2.5-flash-image',
      retrievalSetting: 'none',
    },
    response: { setHeader() {}, status() {} },
  })

  try {
    const accepted = await legacy.default(context('owner-a'))
    const rejected = await legacy.default(context('owner-b'))
    assert.equal(accepted.code, 0)
    assert.deepEqual(rejected, { code: 429, error: 'Job queue is full. Please try again later.' })
    assert.equal(testState.inserts.length, 1)

    while (!resolveFetch) await new Promise((resolve) => setImmediate(resolve))
    resolveFetch(new Response('provider failed', { status: 400 }))
    await legacy.drainJobAdmission()
  } finally {
    globalThis.fetch = previousFetch
    if (previousGateway === undefined) delete process.env.PAPERBANANA_GATEWAY_TOKEN
    else process.env.PAPERBANANA_GATEWAY_TOKEN = previousGateway
  }
})

test('external image responses are read incrementally with a hard byte cap', async () => {
  const legacy = await loadLegacy()
  assert.equal(typeof legacy.readResponseWithLimit, 'function')

  const response = (chunks: string[], contentLength?: string) => new Response(new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(Buffer.from(chunk))
      controller.close()
    },
  }), {
    headers: contentLength === undefined ? {} : { 'Content-Length': contentLength },
  })

  assert.equal(
    (await legacy.readResponseWithLimit(response(['12', '345']), 5, 'reference image')).toString(),
    '12345',
  )
  await assert.rejects(
    legacy.readResponseWithLimit(response(['123', '456']), 5, 'reference image'),
    /reference image exceeds 5 byte limit/,
  )
  await assert.rejects(
    legacy.readResponseWithLimit(response(['123456'], '2'), 5, 'reference image'),
    /reference image exceeds 5 byte limit/,
  )
  let advertisedOversizeCancelled = false
  const advertisedOversize = new Response(new ReadableStream({
    pull() {},
    cancel() { advertisedOversizeCancelled = true },
  }), { headers: { 'Content-Length': '6' } })
  await assert.rejects(
    legacy.readResponseWithLimit(advertisedOversize, 5, 'reference image'),
    /reference image exceeds 5 byte limit/,
  )
  assert.equal(advertisedOversizeCancelled, true)
})

test('inline provider image JSON and decoded base64 are both bounded', async () => {
  const legacy = await loadLegacy()
  assert.equal(typeof legacy.parseBoundedModelResponse, 'function')
  assert.equal(typeof legacy.validateProviderImageBase64, 'function')

  const json = JSON.stringify({ data: [{ b64_json: 'MTIzNDU=' }] })
  assert.deepEqual(
    await legacy.parseBoundedModelResponse(new Response(json), Buffer.byteLength(json), 'provider image response'),
    { data: [{ b64_json: 'MTIzNDU=' }] },
  )
  await assert.rejects(
    legacy.parseBoundedModelResponse(new Response(json), Buffer.byteLength(json) - 1, 'provider image response'),
    /provider image response exceeds/,
  )
  assert.equal(legacy.validateProviderImageBase64('MTIzNDU=', 5, 'provider image'), 'MTIzNDU=')
  assert.throws(
    () => legacy.validateProviderImageBase64('MTIzNDU2', 5, 'provider image'),
    /provider image exceeds 5 byte limit/,
  )
})

test('local object consumption uses bounded internal reads without public signing', async () => {
  const legacy = await loadLegacy()
  const calls: unknown[] = []
  const bucket = {
    async readFile(key: string, maxBytes: number) {
      calls.push(['readFile', key, maxBytes])
      return Buffer.from('internal-bytes')
    },
    async getDownloadUrl() {
      calls.push(['getDownloadUrl'])
      throw new Error('public signer must not be used')
    },
  }

  assert.equal(
    (await legacy.readStoredObject(bucket, 'references/a.png', 5 * 1024 * 1024, 'reference')).toString(),
    'internal-bytes',
  )
  assert.deepEqual(calls, [['readFile', 'references/a.png', 5 * 1024 * 1024]])
})

test('uploaded references are stat-verified and mismatches are deleted before use', async () => {
  const legacy = await loadLegacy()
  assert.equal(typeof legacy.verifyUploadedReferenceObjects, 'function')
  const deleted: string[] = []
  const metadata = new Map<string, { size: number; mimeType: string }>([
    ['references/original.png', { size: 5, mimeType: 'image/png' }],
    ['references/analysis.png', { size: 8, mimeType: 'image/webp' }],
  ])
  const bucket = {
    async headFile(key: string) { return metadata.get(key) },
    async deleteFile(key: string) { deleted.push(key) },
  }
  const images = [{
    filename: 'original.png',
    objectKey: 'references/original.png',
    mimeType: 'image/png',
    size: 5,
    storage: 'bucket',
    analysisObjectKey: 'references/analysis.png',
    analysisMimeType: 'image/webp',
    analysisSize: 8,
  }]

  await legacy.verifyUploadedReferenceObjects(images, bucket)
  assert.deepEqual(deleted, [])

  metadata.set('references/original.png', { size: 6, mimeType: 'image/png' })
  await assert.rejects(
    legacy.verifyUploadedReferenceObjects(images, bucket),
    /uploaded reference metadata does not match the signed declaration/i,
  )
  assert.deepEqual(deleted, ['references/original.png'])

  deleted.length = 0
  metadata.set('references/original.png', { size: 5, mimeType: 'image/jpeg' })
  await assert.rejects(
    legacy.verifyUploadedReferenceObjects(images, bucket),
    /uploaded reference metadata does not match the signed declaration/i,
  )
  assert.deepEqual(deleted, ['references/original.png'])
})

test('strict object storage refuses uploaded references when stat is unavailable', async () => {
  const legacy = await loadLegacy()
  const previous = process.env.PAPERBANANA_STRICT_OBJECT_STORAGE
  process.env.PAPERBANANA_STRICT_OBJECT_STORAGE = 'true'
  try {
    await assert.rejects(
      legacy.verifyUploadedReferenceObjects([{
        filename: 'original.png', objectKey: 'references/original.png', mimeType: 'image/png', size: 5, storage: 'bucket',
      }], {}),
      /object metadata verification is unavailable/i,
    )
  } finally {
    if (previous === undefined) delete process.env.PAPERBANANA_STRICT_OBJECT_STORAGE
    else process.env.PAPERBANANA_STRICT_OBJECT_STORAGE = previous
  }
})

test('strict object storage rejects result and stage writes instead of creating data URLs', async () => {
  const legacy = await loadLegacy()
  const previous = process.env.PAPERBANANA_STRICT_OBJECT_STORAGE
  process.env.PAPERBANANA_STRICT_OBJECT_STORAGE = 'true'
  try {
    await assert.rejects(legacy.saveResult('job-1', 0, 'cG5n', 'image/png', 'base64'), /OSS write failed/)
    await assert.rejects(legacy.saveStageImage('job-1', 0, 'render', 'cG5n', 'image/png', 'base64'), /OSS write failed/)
  } finally {
    if (previous === undefined) delete process.env.PAPERBANANA_STRICT_OBJECT_STORAGE
    else process.env.PAPERBANANA_STRICT_OBJECT_STORAGE = previous
  }
})

test('legacy default retains the historical data URL fallback for rollback', async () => {
  const legacy = await loadLegacy()
  const previous = process.env.PAPERBANANA_STRICT_OBJECT_STORAGE
  delete process.env.PAPERBANANA_STRICT_OBJECT_STORAGE
  try {
    const result = await legacy.saveResult('job-1', 0, 'cG5n', 'image/png', 'base64')
    assert.equal(result.storage, 'database-data-url')
    assert.match(result.url, /^data:image\/png;base64,/)
  } finally {
    if (previous === undefined) delete process.env.PAPERBANANA_STRICT_OBJECT_STORAGE
    else process.env.PAPERBANANA_STRICT_OBJECT_STORAGE = previous
  }
})
