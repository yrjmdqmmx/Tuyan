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
  startAccountDeletionSweep(intervalMs?: number): void
  stopAccountDeletionSweep(): void
  readResponseWithLimit(response: Response, maxBytes: number, label: string): Promise<Buffer>
  parseBoundedModelResponse(response: Response, maxBytes: number, label: string): Promise<any>
  validateProviderImageBase64(value: string, maxBytes: number, label: string): string
  readStoredObject(bucket: Record<string, any>, key: string, maxBytes: number, label: string): Promise<Buffer>
  verifyUploadedReferenceObjects(images: Array<Record<string, unknown>>, bucket?: Record<string, unknown>): Promise<void>
  configureRuntimeFetch(fetchImpl?: typeof fetch): void
  fetchWithRetry(url: string, options: RequestInit | undefined, label: string, attempts?: number): Promise<Response>
  callTextModel(provider: string, model: string, apiKey: string, system: string, user: string, images?: Array<Record<string, string>>): Promise<string>
  callVisionModel(provider: string, model: string, apiKey: string, methodContent: string, caption: string, images: Array<Record<string, string>>): Promise<string>
  callImageModel(provider: string, model: string, apiKey: string, prompt: string, aspectRatio: string, sourceImage?: string, imageSize?: string): Promise<string>
  normalizeModelName(provider: string, model: string): string
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

test('full modelRegistry preserves static providers when OpenRouter discovery is unavailable', async () => {
  const legacy = await loadLegacy()
  legacy.configureRuntimeFetch(async () => {
    const error: any = new Error('海外模型出口暂不可用，请稍后重试。')
    error.code = 'PROVIDER_EGRESS_UNAVAILABLE'
    throw error
  })
  try {
    const result = await legacy.default({
      request: { method: 'POST' },
      body: { action: 'modelRegistry' },
      headers: {},
      response: { setHeader() {}, status() {} },
    })
    assert.equal(result.code, 0)
    assert.equal(result.providers.gemini.defaults.main, 'gemini-3.7-flash')
    assert.equal(result.providers.bailian.defaults.main, 'qwen3.8-max')
    assert.equal(result.providers.openai.defaults.main, 'gpt-5.6-sol')
    assert.equal(Object.hasOwn(result.providers, 'openrouter'), false)
    assert.deepEqual(result.unavailableProviders, { openrouter: '海外模型出口暂不可用，请稍后重试。' })
    assert.doesNotMatch(JSON.stringify(result), /OpenRouter model metadata|request failed/)
  } finally {
    legacy.configureRuntimeFetch()
  }
})

test('filtered OpenRouter registry uses the same structured unavailable envelope', async () => {
  const legacy = await loadLegacy()
  legacy.configureRuntimeFetch(async () => { throw new Error('catalog offline') })
  try {
    const result = await legacy.default({
      request: { method: 'POST' },
      body: { action: 'modelRegistry', provider: 'openrouter' },
      headers: {},
      response: { setHeader() {}, status() {} },
    })
    assert.equal(result.code, 0)
    assert.deepEqual(result.providers, {})
    assert.deepEqual(result.unavailableProviders, { openrouter: 'OpenRouter model catalog is temporarily unavailable' })
  } finally {
    legacy.configureRuntimeFetch()
  }
})

test('createJob rejects a registered model used in the wrong role before inserting a task', async () => {
  const legacy = await loadLegacy()
  const result = await legacy.default({
    request: { method: 'POST' },
    body: {
      action: 'createJob',
      provider: 'openai',
      apiKeys: { openai: 'key' },
      methodContent: 'A sufficiently detailed method section for model role validation.',
      caption: 'A valid caption.',
      mainModelName: 'gpt-image-2',
      imageModelName: 'gpt-image-2',
      referenceVisionModelName: 'gpt-5.6-sol',
    },
    headers: {},
    response: { setHeader() {}, status() {} },
  })
  assert.equal(result.code, 400)
  assert.match(result.error, /not registered for main/)
})

test('modelRegistry is the public server authority for current Gemini and Bailian roles', async () => {
  const legacy = await loadLegacy()
  const context = (body: Record<string, unknown>) => ({
    request: { method: 'POST' },
    body,
    headers: {},
    response: { setHeader() {}, status() {} },
  })

  const gemini = await legacy.default(context({ action: 'modelRegistry', provider: 'gemini' }))
  assert.equal(gemini.code, 0)
  assert.match(gemini.registryVersion, /^2026-08-/)
  assert.deepEqual(gemini.providers.gemini.defaults, {
    main: 'gemini-3.7-flash',
    image: 'gemini-3.1-flash-image',
    vision: 'gemini-3.7-flash',
  })
  const geminiModels = new Map<string, any>(gemini.providers.gemini.models.map((model: any) => [model.id, model]))
  assert.deepEqual(geminiModels.get('gemini-3.7-flash')?.roles, ['main', 'vision'])
  assert.equal(geminiModels.get('gemini-3.7-flash')?.capabilities.referenceImages, true)
  assert.equal(geminiModels.get('gemini-3.7-flash')?.protocol, 'gemini-generate-content')
  assert.deepEqual(geminiModels.get('gemini-3.1-flash-image')?.roles, ['image'])
  assert.equal(geminiModels.has('gemini-3.1-pro'), false)
  assert.equal(geminiModels.has('gemini-3-flash'), false)

  const bailian = await legacy.default(context({ action: 'modelRegistry', provider: 'bailian' }))
  assert.equal(bailian.code, 0)
  assert.deepEqual(bailian.providers.bailian.defaults, {
    main: 'qwen3.8-max',
    image: 'wan2.7-image-pro',
    vision: 'qwen3.8-max',
  })
  const bailianModels = new Map<string, any>(bailian.providers.bailian.models.map((model: any) => [model.id, model]))
  for (const current of ['qwen3.8-max', 'qwen3.7-flash', 'glm-5.2', 'kimi/kimi-k3', 'MiniMax/MiniMax-M3', 'qwen-image-3.0-pro']) {
    assert.equal(bailianModels.has(current), true, current)
  }
  for (const retired of ['qwen3.7-max', 'qwen3.6-flash', 'glm-5.1', 'kimi-k2.6', 'MiniMax/MiniMax-M2.7']) {
    assert.equal(bailianModels.has(retired), false, retired)
  }

  const openai = await legacy.default(context({ action: 'modelRegistry', provider: 'openai' }))
  assert.equal(openai.code, 0)
  assert.deepEqual(openai.providers.openai.defaults, {
    main: 'gpt-5.6-sol',
    image: 'gpt-image-2',
    vision: 'gpt-5.6-sol',
  })
  const openaiModels = new Map<string, any>(openai.providers.openai.models.map((model: any) => [model.id, model]))
  for (const current of ['gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-5.6-luna', 'gpt-image-2']) {
    assert.equal(openaiModels.has(current), true, current)
  }
})

test('legacy client defaults map explicitly to current registered model IDs', async () => {
  const legacy = await loadLegacy()
  assert.equal(legacy.normalizeModelName('gemini', 'gemini-3.1-pro'), 'gemini-3.1-pro-preview')
  assert.equal(legacy.normalizeModelName('gemini', 'gemini-3-flash'), 'gemini-3-flash-preview')
  assert.equal(legacy.normalizeModelName('openai', 'gpt-5.5-pro'), 'gpt-5.6-sol')
  assert.equal(legacy.normalizeModelName('openai', 'gpt-5.4-pro'), 'gpt-5.6-sol')
  assert.equal(legacy.normalizeModelName('openai', 'gpt-image-1.5'), 'gpt-image-2')
  assert.equal(legacy.normalizeModelName('bailian', 'qwen3.7-max'), 'qwen3.8-max')
  assert.equal(legacy.normalizeModelName('bailian', 'qwen-image-2.0-pro'), 'qwen-image-3.0-pro')
  assert.equal(legacy.normalizeModelName('bailian', 'kimi-k2.6'), 'kimi/kimi-k3')
  assert.equal(legacy.normalizeModelName('bailian', 'MiniMax-M2.7'), 'MiniMax/MiniMax-M3')
  assert.equal(
    legacy.normalizeModelName('openrouter', 'openrouter/google/gemini-3.1-flash-image-preview'),
    'openrouter/google/gemini-3.1-flash-image',
  )
  assert.equal(
    legacy.normalizeModelName('openrouter', 'openrouter/openai/gpt-5-image'),
    'openrouter/openai/gpt-image-2',
  )
})

test('Gemini 3 text and vision requests keep provider sampling defaults', async () => {
  const legacy = await loadLegacy()
  const requests: Array<{ url: string; body: any }> = []
  legacy.configureRuntimeFetch(async (input, init) => {
    requests.push({ url: String(input), body: JSON.parse(String(init?.body || '{}')) })
    const isImage = String(input).includes('gemini-3.1-flash-image')
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [isImage ? { inlineData: { data: 'aW1hZ2U=' } } : { text: 'ok' }] } }] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  })
  try {
    assert.equal(await legacy.callTextModel('gemini', 'gemini-3.7-flash', 'key', 'system', 'user'), 'ok')
    assert.equal(await legacy.callVisionModel('gemini', 'gemini-3.7-flash', 'key', 'method', 'caption', [{
      url: 'data:image/png;base64,YQ==',
      mimeType: 'image/png',
    }]), 'ok')
    assert.equal(await legacy.callImageModel('gemini', 'gemini-3.1-flash-image', 'key', 'diagram', '16:9', '', '4K'), 'aW1hZ2U=')
  } finally {
    legacy.configureRuntimeFetch()
  }

  const generationRequests = requests.filter((request) => request.url.includes(':generateContent'))
  assert.equal(generationRequests.length, 3)
  for (const request of generationRequests.slice(0, 2)) {
    assert.match(request.url, /models\/gemini-3\.7-flash:generateContent/)
    const serialized = JSON.stringify(request.body)
    assert.doesNotMatch(serialized, /temperature|topP|topK|top_p|top_k/)
  }
  assert.equal(generationRequests[2].body.generationConfig.imageConfig.imageSize, '4K')
  assert.doesNotMatch(JSON.stringify(generationRequests[2].body), /temperature|topP|topK|top_p|top_k/)
})

test('OpenRouter Gemini 3 text and vision requests also omit legacy sampling overrides', async () => {
  const legacy = await loadLegacy()
  const bodies: any[] = []
  legacy.configureRuntimeFetch(async (_input, init) => {
    bodies.push(JSON.parse(String(init?.body || '{}')))
    return Response.json({ choices: [{ message: { content: 'ok' } }] })
  })
  try {
    assert.equal(await legacy.callTextModel('openrouter', 'openrouter/google/gemini-3.7-flash', 'key', 'system', 'user'), 'ok')
    assert.equal(await legacy.callVisionModel('openrouter', 'openrouter/google/gemini-3.7-flash', 'key', 'method', 'caption', [{
      url: 'https://images.invalid/reference.png',
      mimeType: 'image/png',
    }]), 'ok')
  } finally {
    legacy.configureRuntimeFetch()
  }
  assert.equal(bodies.length, 2)
  for (const body of bodies) assert.doesNotMatch(JSON.stringify(body), /temperature|topP|topK|top_p|top_k/)
})

test('Bailian image-content fallback uses the current registered vision model', async () => {
  const legacy = await loadLegacy()
  const previous = process.env.BAILIAN_VISION_MODEL
  delete process.env.BAILIAN_VISION_MODEL
  const models: string[] = []
  legacy.configureRuntimeFetch(async (_input, init) => {
    const body = JSON.parse(String(init?.body || '{}'))
    models.push(body.model)
    if (models.length === 1) {
      return Response.json({ error: { message: 'Unexpected item type in content' } }, { status: 400 })
    }
    return Response.json({ choices: [{ message: { content: 'ok' } }] })
  })
  try {
    assert.equal(await legacy.callVisionModel('bailian', 'glm-5.2', 'key', 'method', 'caption', [{
      url: 'https://images.invalid/reference.png',
      mimeType: 'image/png',
    }]), 'ok')
  } finally {
    legacy.configureRuntimeFetch()
    if (previous === undefined) delete process.env.BAILIAN_VISION_MODEL
    else process.env.BAILIAN_VISION_MODEL = previous
  }
  assert.deepEqual(models, ['glm-5.2', 'qwen3.8-max'])
})

test('OpenRouter routes every dedicated image catalog model to POST /images', async () => {
  const legacy = await loadLegacy()
  const calls: Array<{ url: string; body: any }> = []
  const textAndImageModel = {
    id: 'google/gemini-3.1-flash-image',
    name: 'Nano Banana 2',
    architecture: { input_modalities: ['text', 'image'], output_modalities: ['text', 'image'] },
    supported_parameters: ['modalities', 'image_config'],
  }
  const dedicatedModel = {
    id: 'black-forest-labs/flux.2-pro',
    name: 'FLUX.2 Pro',
    architecture: { input_modalities: ['text', 'image'], output_modalities: ['image'] },
    supported_parameters: ['aspect_ratio', 'resolution', 'input_references'],
  }
  legacy.configureRuntimeFetch(async (input, init) => {
    const url = String(input)
    const body = init?.body ? JSON.parse(String(init.body)) : undefined
    calls.push({ url, body })
    if (url.endsWith('/models?output_modalities=image')) {
      return Response.json({ data: [textAndImageModel, dedicatedModel] })
    }
    if (url.endsWith('/api/v1/models')) {
      return Response.json({
        data: [
          {
            id: 'google/gemini-3.7-flash',
            name: 'Gemini 3.7 Flash',
            architecture: { input_modalities: ['text', 'image'], output_modalities: ['text'] },
          },
          textAndImageModel,
        ],
      })
    }
    if (url.endsWith('/images/models')) {
      return Response.json({
        data: [textAndImageModel, {
          ...dedicatedModel,
          supported_parameters: {
            aspect_ratio: { type: 'enum', values: ['1:1', '16:9'] },
            resolution: { type: 'enum', values: ['1K', '2K'] },
            input_references: { type: 'range', min: 0, max: 1 },
          },
        }],
      })
    }
    if (url.endsWith('/api/v1/images')) {
      return Response.json({ data: [{ b64_json: body.model.includes('gemini') ? 'Z2VtaW5p' : 'ZGVkaWNhdGVk', media_type: 'image/png' }] })
    }
    if (url.endsWith('/chat/completions')) {
      return Response.json({ choices: [{ message: { images: [{ image_url: { url: 'data:image/png;base64,Y2hhdA==' } }] } }] })
    }
    throw new Error(`unexpected request: ${url}`)
  })
  try {
    assert.equal(
      await legacy.callImageModel('openrouter', 'openrouter/black-forest-labs/flux.2-pro', 'key', 'diagram', '16:9', '', '2K'),
      'ZGVkaWNhdGVk',
    )
    assert.equal(
      await legacy.callImageModel('openrouter', 'openrouter/google/gemini-3.1-flash-image', 'key', 'diagram', '16:9', '', '2K'),
      'Z2VtaW5p',
    )
    const registry = await legacy.default({
      request: { method: 'POST' },
      body: { action: 'modelRegistry', provider: 'openrouter' },
      headers: {},
      response: { setHeader() {}, status() {} },
    })
    assert.equal(registry.code, 0)
    const registryModels = new Map<string, any>(registry.providers.openrouter.models.map((entry: any) => [entry.id, entry]))
    assert.equal(registryModels.get('black-forest-labs/flux.2-pro')?.protocol, 'openrouter-images')
    assert.equal(registryModels.get('google/gemini-3.1-flash-image')?.protocol, 'openrouter-images')
    assert.deepEqual(registryModels.get('google/gemini-3.7-flash')?.roles, ['main', 'vision'])
    await assert.rejects(
      legacy.callImageModel('openrouter', 'openrouter/recraft/not-in-catalog', 'key', 'diagram', '16:9'),
      /not available in the authoritative OpenRouter image catalog/,
    )
  } finally {
    legacy.configureRuntimeFetch()
  }

  const dedicated = calls.find((call) => call.url.endsWith('/api/v1/images'))
  assert.deepEqual(dedicated?.body, {
    model: 'black-forest-labs/flux.2-pro',
    prompt: 'diagram',
    resolution: '2K',
    aspect_ratio: '16:9',
  })
  assert.equal(calls.some((call) => call.url.endsWith('/chat/completions')), false)
  assert.equal(calls.some((call) => call.url.endsWith('/images/generations')), false)
  assert.equal(
    calls.some((call) => call.url.endsWith('/chat/completions') && call.body?.model === 'black-forest-labs/flux.2-pro'),
    false,
  )
})

test('OpenRouter vector image responses are rasterized before the PNG pipeline saves them', async () => {
  const legacy = await loadLegacy()
  const previousWasm = process.env.RESVG_WASM_PATH
  process.env.RESVG_WASM_PATH = path.resolve('../../node_modules/.pnpm/@resvg+resvg-wasm@2.6.2/node_modules/@resvg/resvg-wasm/index_bg.wasm')
  const model = {
    id: 'recraft/recraft-v4.1-pro-vector',
    name: 'Recraft Vector',
    architecture: { input_modalities: ['text'], output_modalities: ['image'] },
    supported_parameters: { output_format: { type: 'enum', values: ['svg'] } },
  }
  legacy.configureRuntimeFetch(async (input) => {
    const url = String(input)
    if (url.endsWith('/models?output_modalities=image')) return Response.json({ data: [model] })
    if (url.endsWith('/images/models')) return Response.json({ data: [model] })
    if (url.endsWith('/api/v1/images')) {
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="16"><rect width="32" height="16" fill="#56705f"/></svg>'
      return Response.json({ data: [{ b64_json: Buffer.from(svg).toString('base64'), media_type: 'image/svg+xml' }] })
    }
    throw new Error(`unexpected request: ${url}`)
  })
  try {
    const png = await legacy.callImageModel('openrouter', `openrouter/${model.id}`, 'key', 'diagram', '16:9')
    assert.deepEqual(Buffer.from(png, 'base64').subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  } finally {
    legacy.configureRuntimeFetch()
    if (previousWasm === undefined) delete process.env.RESVG_WASM_PATH
    else process.env.RESVG_WASM_PATH = previousWasm
  }
})

test('OpenRouter excludes paid image models whose declared output formats cannot enter the PNG pipeline', async () => {
  const legacy = await loadLegacy()
  const incompatible = [
    {
      id: 'sourceful/riverflow-v2.5-fast',
      name: 'Riverflow JPEG only',
      architecture: { input_modalities: ['text', 'image'], output_modalities: ['image'] },
      supported_parameters: { output_format: { type: 'enum', values: ['jpeg'] } },
    },
    {
      id: 'example/webp-only',
      name: 'WebP only',
      architecture: { input_modalities: ['text'], output_modalities: ['image'] },
      supported_parameters: { output_format: { type: 'enum', values: ['webp'] } },
    },
  ]
  const safe = {
    id: 'sourceful/riverflow-v2.5-pro',
    name: 'Riverflow PNG capable',
    architecture: { input_modalities: ['text', 'image'], output_modalities: ['image'] },
    supported_parameters: { output_format: { type: 'enum', values: ['png', 'jpeg', 'webp'] } },
  }
  const imageCalls: any[] = []
  legacy.configureRuntimeFetch(async (input, init) => {
    const url = String(input)
    if (url.endsWith('/models?output_modalities=image')) return Response.json({ data: [...incompatible, safe] })
    if (url.endsWith('/api/v1/models')) return Response.json({ data: [] })
    if (url.endsWith('/images/models')) return Response.json({ data: [...incompatible, safe] })
    if (url.endsWith('/api/v1/images')) {
      imageCalls.push(JSON.parse(String(init?.body || '{}')))
      return Response.json({ data: [{ b64_json: 'cG5n', media_type: 'image/png' }] })
    }
    throw new Error(`unexpected request: ${url}`)
  })
  try {
    const registry = await legacy.default({
      request: { method: 'POST' },
      body: { action: 'modelRegistry', provider: 'openrouter' },
      headers: {},
      response: { setHeader() {}, status() {} },
    })
    const ids = registry.providers.openrouter.models.map((model: any) => model.id)
    assert.equal(ids.includes(safe.id), true)
    for (const model of incompatible) assert.equal(ids.includes(model.id), false, model.id)
    for (const model of incompatible) {
      await assert.rejects(
        legacy.callImageModel('openrouter', `openrouter/${model.id}`, 'key', 'diagram', '16:9'),
        /does not expose a PNG or SVG output format/,
      )
    }
    assert.equal(
      await legacy.callImageModel('openrouter', `openrouter/${safe.id}`, 'key', 'diagram', '16:9'),
      'cG5n',
    )
    assert.equal(imageCalls.length, 1)
    assert.equal(imageCalls[0].output_format, 'png')
  } finally {
    legacy.configureRuntimeFetch()
  }
})

test('Bailian current image models use their official multimodal parameters and resolution limits', async () => {
  const legacy = await loadLegacy()
  const payloads: any[] = []
  legacy.configureRuntimeFetch(async (input, init) => {
    const url = String(input)
    if (url.includes('/multimodal-generation/generation')) {
      payloads.push(JSON.parse(String(init?.body || '{}')))
      return Response.json({ output: { choices: [{ message: { content: [{ image: 'https://images.invalid/result.png' }] } }] } })
    }
    if (url === 'https://images.invalid/result.png') {
      return new Response('image-bytes', { status: 200, headers: { 'Content-Type': 'image/png' } })
    }
    throw new Error(`unexpected request: ${url}`)
  })
  try {
    await legacy.callImageModel('bailian', 'wan2.7-image-pro', 'key', 'diagram', '16:9', '', '4K')
    await legacy.callImageModel('bailian', 'qwen-image-3.0-pro', 'key', 'diagram', '16:9', '', '4K')
  } finally {
    legacy.configureRuntimeFetch()
  }

  assert.equal(payloads[0].parameters.size, '4096*2304')
  assert.equal(payloads[0].parameters.thinking_mode, true)
  assert.equal(Object.hasOwn(payloads[0].parameters, 'prompt_extend'), false)
  assert.equal(payloads[1].parameters.size, '2048*1152')
  assert.equal(payloads[1].parameters.prompt_extend, true)
  assert.equal(Object.hasOwn(payloads[1].parameters, 'thinking_mode'), false)
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
        nodePaths: [path.resolve(packageRoot, 'node_modules')],
        plugins: [{
          name: 'fake-laf-cloud',
          setup(builder) {
            builder.onResolve({ filter: /^@lafjs\/cloud$/ }, () => ({ path: 'fake-laf-cloud', namespace: 'fake' }))
            builder.onLoad({ filter: /.*/, namespace: 'fake' }, () => ({
              loader: 'js',
              contents: `
                const state = globalThis.__paperbananaLegacyTestState ||= { inserts: [] };
                const collectionFor = (name) => ({
                  find() { return { sort() { return this }, limit() { return this }, async toArray() { return [] } } },
                  async findOne(query) {
                    if (name === 'paperbanana_jobs' && query?._id === 'job-1') return { _id: 'job-1', userId: '' };
                    return null;
                  },
                  async insertOne(document) { state.inserts.push(document) },
                  async updateOne() {}, async deleteMany() { return { deletedCount: 0 } }
                });
                const bucket = {
                  async writeFile() { throw new Error('OSS write failed') },
                  async getDownloadUrl() { return 'https://signed.invalid/object' },
                  async getUploadUrl() { return 'https://signed.invalid/upload' },
                  async listFiles() { return { Contents: [], IsTruncated: false } },
                  async deleteFile() {}
                };
                export default { mongo: { db: { collection(name) { return collectionFor(name) } } }, storage: { bucket() { return bucket } } };
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
  assert.equal(typeof legacy.startAccountDeletionSweep, 'function')
  assert.equal(typeof legacy.stopAccountDeletionSweep, 'function')
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

test('account deletion freezes one owner and drains its running work without stopping other users', async () => {
  const legacy = await loadLegacy()
  let finishOwner!: () => void
  const ownerTask = new Promise<void>((resolve) => { finishOwner = resolve })
  const controller = legacy.createJobAdmissionController(
    { maxActive: 2, maxPending: 2, maxPerOwner: 2, maxPerIp: 2 },
    {
      execute: async (task: any) => {
        if (task.jobId === 'owner-job') await ownerTask
      },
      markFailed: async () => {},
      logError: () => {},
    },
  )
  const owner = { ownerKey: 'user:owner-1', ipKey: 'ip:1' }
  const other = { ownerKey: 'user:owner-2', ipKey: 'ip:2' }
  const running = controller.reserve(owner)
  assert.equal(running.ok, true)
  controller.commit(running, { jobId: 'owner-job', kind: 'create', body: {}, apiKey: 'key' })

  controller.freezeOwners([owner.ownerKey])
  assert.deepEqual(controller.reserve(owner), {
    ok: false,
    code: 409,
    error: 'Account deletion is in progress. New jobs and uploads are disabled.',
  })
  assert.equal(controller.reserve(other).ok, true)

  let drained = false
  const drain = controller.drainOwners([owner.ownerKey]).then(() => { drained = true })
  await new Promise((resolve) => setTimeout(resolve, 5))
  assert.equal(drained, false)
  finishOwner()
  await drain
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
