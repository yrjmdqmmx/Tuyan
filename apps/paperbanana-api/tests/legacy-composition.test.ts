import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { build } from 'esbuild'
import sharp from 'sharp'

const onePixelPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADUlEQVQImWP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg=='
const onePixelWebpBase64 = 'UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAdQuFr1q/+BiOh/AAA='

const paidVerifiedOpenRouterDefaultImageFormats = new Map<string, 'png' | 'jpeg' | 'webp'>([
  ['bytedance-seed/seedream-4.5', 'jpeg'],
  ['bytedance-seed/seedream-5-0-lite', 'jpeg'],
  ['bytedance-seed/seedream-5-0-pro', 'jpeg'],
  ['google/gemini-2.5-flash-image', 'png'],
  ['google/gemini-3-pro-image', 'jpeg'],
  ['google/gemini-3-pro-image-preview', 'jpeg'],
  ['google/gemini-3.1-flash-image', 'jpeg'],
  ['google/gemini-3.1-flash-image-preview', 'jpeg'],
  ['google/gemini-3.1-flash-lite-image', 'jpeg'],
  ['krea/krea-2-large', 'png'],
  ['krea/krea-2-medium', 'png'],
  ['krea/krea-2-medium-turbo', 'png'],
  ['microsoft/mai-image-2.5', 'png'],
  ['microsoft/mai-image-2.5-pro', 'png'],
  ['openai/gpt-5-image', 'png'],
  ['openai/gpt-5-image-mini', 'png'],
  ['openai/gpt-5.4-image-2', 'png'],
  ['openai/gpt-image-1', 'png'],
  ['openai/gpt-image-1-mini', 'png'],
  ['openai/gpt-image-2', 'png'],
  ['qwen/qwen-image-3', 'png'],
  ['qwen/qwen-image-3-pro', 'png'],
  ['recraft/recraft-v3', 'webp'],
  ['recraft/recraft-v4', 'webp'],
  ['recraft/recraft-v4-pro', 'webp'],
  ['recraft/recraft-v4.1', 'webp'],
  ['recraft/recraft-v4.1-pro', 'webp'],
  ['recraft/recraft-v4.1-utility', 'webp'],
  ['recraft/recraft-v4.1-utility-pro', 'webp'],
  ['sourceful/riverflow-v2-fast', 'webp'],
  ['sourceful/riverflow-v2-pro', 'webp'],
  ['sourceful/riverflow-v2.5-fast', 'webp'],
  ['x-ai/grok-imagine-image-2.0', 'jpeg'],
  ['x-ai/grok-imagine-image-quality', 'jpeg'],
])

type LegacyPolicyModule = {
  default(ctx: Record<string, any>): Promise<any>
  toCreateExecutionBody(body: Record<string, unknown>): Record<string, unknown>
  toRefineExecutionBody(body: Record<string, unknown>): Record<string, unknown>
  resolveModelRouting(body: Record<string, unknown>): Record<string, unknown>
  requiredCreateRouteRoles(body: Record<string, unknown>, maxCriticRounds: number): string[]
  requiredRefineRouteRoles(body: Record<string, unknown>): string[]
  selectRequiredRouteSecrets(routes: Record<string, any>, apiKeys: Record<string, string>, roles: string[]): Record<string, string>
  modelRoleSelectionError(provider: string, registry: Record<string, any>, selections: Array<Record<string, string>>): string
  resolveReferenceImageMode(body: Record<string, unknown>): Promise<Record<string, unknown>>
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
  callTextModel(provider: string, model: string, apiKey: string, system: string, user: string, images?: Array<Record<string, string>>, policy?: { attempts?: number; signal?: AbortSignal; region?: 'cn' | 'global' }): Promise<string>
  callVisionModel(provider: string, model: string, apiKey: string, methodContent: string, caption: string, images: Array<Record<string, string>>, region?: 'cn' | 'global'): Promise<string>
  callImageModel(provider: string, model: string, apiKey: string, prompt: string, aspectRatio: string, sourceImage?: string, imageSize?: string, strictImageSize?: boolean, region?: 'cn' | 'global'): Promise<string>
  callRecraftSvg(model: string, apiKey: string, prompt: string, aspectRatio: string): Promise<string>
  pollBailianImageTask(taskId: string, apiKey: string, policy?: { intervalMs: number; timeoutMs: number }): Promise<any>
  normalizeModelName(provider: string, model: string): string
  withNegativePrompt(text: string, negativePrompt?: string): string
  resolveManualRetrievedReferences(ids: string[]): Promise<Array<Record<string, any>>>
  resolveRetrievedReferences(body: Record<string, any>, apiKey: string): Promise<Array<Record<string, any>>>
}

function installProviderAccountTestGateway() {
  const previous = process.env.PAPERBANANA_GATEWAY_TOKEN
  const token = 'provider-account-test-gateway'
  process.env.PAPERBANANA_GATEWAY_TOKEN = token
  return {
    token,
    restore() {
      if (previous === undefined) delete process.env.PAPERBANANA_GATEWAY_TOKEN
      else process.env.PAPERBANANA_GATEWAY_TOKEN = previous
    },
  }
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

test('legacy bounded model response preserves non-2xx status on a real Response without enumerating provider response facts', async () => {
  const legacy = await loadLegacy()
  for (const status of [401, 429, 500]) {
    const secretBody = `provider-secret-body-${status}`
    await assert.rejects(
      legacy.parseBoundedModelResponse(Response.json({ error: { message: secretBody } }, { status }), 1024, 'provider response'),
      (error: any) => {
        assert.equal(error.status, status)
        assert.equal(error.message, secretBody)
        assert.equal(JSON.stringify(error).includes(String(status)), false)
        return true
      },
    )
  }
})

test('built Ark callImageModel preserves a real 401 JSON response status for the authoritative runtime boundary', async () => {
  const legacy = await loadLegacy()
  legacy.configureRuntimeFetch(async () => Response.json({ error: { message: 'ark request rejected' } }, { status: 401 }))
  try {
    await assert.rejects(
      legacy.callImageModel('ark', 'doubao-seedream-4-0-250828', 'key', 'diagram', '16:9', '', '2K'),
      (error: any) => error.status === 401 && error.message === 'ark request rejected',
    )
  } finally {
    legacy.configureRuntimeFetch()
  }
})

test('production build explicitly resolves and bundles the Ark JPEG decoder', async () => {
  const packageJson = JSON.parse(fs.readFileSync(path.resolve(packageRoot, 'package.json'), 'utf8'))
  assert.match(packageJson.scripts.build, /--alias:jpeg-js=\.\/node_modules\/jpeg-js(?:\s|$)/)
  await build({
    entryPoints: [path.resolve(packageRoot, 'src/main.ts')],
    absWorkingDir: packageRoot,
    bundle: true,
    platform: 'node',
    target: 'node24',
    format: 'cjs',
    write: false,
    alias: {
      '@lafjs/cloud': './src/laf-cloud.ts',
      'jpeg-js': './node_modules/jpeg-js',
    },
    external: ['@resvg/resvg-wasm', 'ali-oss', 'express', 'mongodb', 'sharp'],
  })
})

test('production build ships the exact maintained WebP decoder as an external runtime dependency', async () => {
  const packageJson = JSON.parse(fs.readFileSync(path.resolve(packageRoot, 'package.json'), 'utf8'))
  assert.equal(packageJson.dependencies?.sharp, '0.35.3')
  assert.equal(packageJson.dependencies?.undici, '7.29.0')
  assert.match(packageJson.scripts.build, /--external:sharp(?:\s|$)/)
  await build({
    entryPoints: [path.resolve(packageRoot, 'src/main.ts')],
    absWorkingDir: packageRoot,
    bundle: true,
    platform: 'node',
    target: 'node24',
    format: 'cjs',
    write: false,
    alias: {
      '@lafjs/cloud': './src/laf-cloud.ts',
      'jpeg-js': './node_modules/jpeg-js',
    },
    external: ['@resvg/resvg-wasm', 'ali-oss', 'express', 'mongodb', 'sharp'],
  })
})

test('Core container build verifies its deployed sharp runtime can convert real WebP to PNG', () => {
  const dockerfile = fs.readFileSync(path.resolve(packageRoot, 'Dockerfile'), 'utf8')
  assert.match(dockerfile, /require\(["']sharp["']\)/)
  assert.match(dockerfile, /UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAdQuFr1q\/\+BiOh\/AAA=/)
  assert.match(dockerfile, /0x89\s*,\s*0x50\s*,\s*0x4e\s*,\s*0x47/i)
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
    assert.equal(result.routeContractVersion, 1)
    assert.equal(result.supportsModelRoutes, true)
    assert.equal(result.providers.gemini.defaults.main, 'gemini-3.7-flash')
    assert.equal(result.providers.bailian.defaults.main, 'qwen3.8-max')
    assert.equal(result.providers.openai.defaults.main, 'gpt-5.6-sol')
    assert.equal(result.providers.ark.defaults.main, 'doubao-seed-2-1-pro-260628')
    assert.equal(Object.hasOwn(result.providers, 'openrouter'), false)
    assert.deepEqual(result.unavailableProviders, { openrouter: '海外模型出口暂不可用，请稍后重试。' })
    assert.doesNotMatch(JSON.stringify(result), /OpenRouter model metadata|request failed/)
  } finally {
    legacy.configureRuntimeFetch()
  }
})

test('model routing resolves legacy fields and complete explicit routes without inventing mixed providers', async () => {
  const legacy = await loadLegacy()
  assert.equal(typeof legacy.resolveModelRouting, 'function')

  assert.deepEqual(legacy.resolveModelRouting({
    provider: 'openai',
    mainModelName: 'gpt-5.6-sol',
    imageModelName: 'gpt-image-2',
  }), {
    modelRoutes: {
      main: { accessProvider: 'openai', modelId: 'gpt-5.6-sol' },
      image: { accessProvider: 'openai', modelId: 'gpt-image-2' },
      vision: { accessProvider: 'openai', modelId: 'gpt-5.6-sol' },
    },
    routingMode: 'single',
    modelRoutingVersion: 1,
    modelRoutingSource: 'legacy-derived',
    provider: 'openai',
    mainModelName: 'gpt-5.6-sol',
    imageModelName: 'gpt-image-2',
    referenceVisionModelName: 'gpt-5.6-sol',
  })

  assert.deepEqual(legacy.resolveModelRouting({
    provider: 'openai',
    configurationMode: 'advanced',
    modelRoutes: {
      main: { accessProvider: 'openai', modelId: 'gpt-5.6-sol' },
      image: { accessProvider: 'gemini', modelId: 'gemini-3.1-flash-image' },
      vision: { accessProvider: 'bailian', modelId: 'qwen3.7-plus' },
    },
  }), {
    modelRoutes: {
      main: { accessProvider: 'openai', modelId: 'gpt-5.6-sol' },
      image: { accessProvider: 'gemini', modelId: 'gemini-3.1-flash-image' },
      vision: { accessProvider: 'bailian', modelId: 'qwen3.7-plus' },
    },
    routingMode: 'mixed',
    modelRoutingVersion: 1,
    modelRoutingSource: 'explicit',
    provider: 'openai',
    mainModelName: 'gpt-5.6-sol',
    imageModelName: 'gemini-3.1-flash-image',
    referenceVisionModelName: 'qwen3.7-plus',
  })
})

test('createJob rejects explicit route conflicts, malformed routes, wrong roles, and mixed simple mode before persistence', async () => {
  const legacy = await loadLegacy()
  const state = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  const base = {
    action: 'createJob',
    provider: 'openai',
    apiKeys: { openai: 'main-secret', gemini: 'image-secret', bailian: 'vision-secret' },
    methodContent: 'A sufficiently detailed method section for explicit model route validation.',
    caption: 'Validate explicit routes.',
    configurationMode: 'advanced',
    modelRoutes: {
      main: { accessProvider: 'openai', modelId: 'gpt-5.6-sol' },
      image: { accessProvider: 'gemini', modelId: 'gemini-3.1-flash-image' },
      vision: { accessProvider: 'bailian', modelId: 'qwen3.7-plus' },
    },
  }
  const invoke = (overrides: Record<string, unknown>) => legacy.default({
    request: { method: 'POST' },
    body: { ...base, ...overrides },
    headers: {},
    response: { setHeader() {}, status() {} },
  })
  const insertCount = state.inserts.length

  const conflict = await invoke({ imageModelName: 'gpt-image-2' })
  assert.deepEqual(conflict, {
    code: 400,
    error: 'Legacy model fields conflict with modelRoutes',
    businessCode: 'MODEL_ROUTE_CONFLICT',
  })

  const incomplete = await invoke({ modelRoutes: { main: base.modelRoutes.main, image: base.modelRoutes.image } })
  assert.equal(incomplete.code, 400)
  assert.equal(incomplete.businessCode, 'MODEL_ROUTE_INVALID')

  for (const invalidMain of [
    { accessProvider: 'unknown-provider', modelId: 'gpt-5.6-sol' },
    { accessProvider: 'openai', modelId: '   ' },
    { accessProvider: 'openai', modelId: 'x'.repeat(121) },
  ]) {
    const invalid = await invoke({ modelRoutes: { ...base.modelRoutes, main: invalidMain } })
    assert.equal(invalid.code, 400)
    assert.equal(invalid.businessCode, 'MODEL_ROUTE_INVALID')
  }

  const wrongRole = await invoke({
    modelRoutes: { ...base.modelRoutes, main: { accessProvider: 'openai', modelId: 'gpt-image-2' } },
  })
  assert.equal(wrongRole.code, 400)
  assert.match(wrongRole.error, /not registered for main/)

  const wrongUnusedImageRole = await invoke({
    outputFormat: 'svg', retrievalSetting: 'none', maxCriticRounds: 0,
    modelRoutes: { ...base.modelRoutes, image: { accessProvider: 'gemini', modelId: 'gemini-3.7-flash' } },
  })
  assert.equal(wrongUnusedImageRole.code, 400)
  assert.match(wrongUnusedImageRole.error, /not registered for image/)

  const wrongUnusedVisionRole = await invoke({
    outputFormat: 'svg', retrievalSetting: 'none', maxCriticRounds: 0,
    modelRoutes: { ...base.modelRoutes, vision: { accessProvider: 'bailian', modelId: 'wan2.7-image-pro' } },
  })
  assert.equal(wrongUnusedVisionRole.code, 400)
  assert.match(wrongUnusedVisionRole.error, /not registered for vision/)

  const simpleMixed = await invoke({ configurationMode: 'simple' })
  assert.deepEqual(simpleMixed, {
    code: 400,
    error: 'Mixed model routes require advanced configuration mode',
    businessCode: 'MODEL_ROUTE_MIXED_NOT_ALLOWED',
  })
  assert.equal(state.inserts.length, insertCount)
})

test('advanced explicit routing persists canonical public fields while retaining only reachable provider secrets', async () => {
  const legacy = await loadLegacy()
  const state = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  const previousWriteMode = state.ossWriteMode
  const previousInserts = state.inserts
  state.ossWriteMode = 'fail'
  state.inserts = []
  legacy.configureRuntimeFetch(async () => new Response('provider failed', { status: 400 }))
  try {
    const queued = await legacy.default({
      request: { method: 'POST' },
      body: {
        action: 'createJob',
        provider: 'openai',
        apiKeys: { openai: 'main-secret' },
        methodContent: 'A sufficiently detailed method section for persisted model route validation.',
        caption: 'Persist explicit route metadata.',
        configurationMode: 'advanced',
        outputFormat: 'svg',
        retrievalSetting: 'none',
        maxCriticRounds: 0,
        modelRoutes: {
          main: { accessProvider: 'openai', modelId: 'gpt-5.6-sol' },
          image: { accessProvider: 'gemini', modelId: 'gemini-3.1-flash-image' },
          vision: { accessProvider: 'bailian', modelId: 'qwen3.7-plus' },
        },
      },
      headers: {},
      response: { setHeader() {}, status() {} },
    })
    assert.equal(queued.code, 0, JSON.stringify(queued))
    await legacy.drainJobAdmission()

    const record = state.inserts[0]
    assert.equal(record.provider, 'openai')
    assert.equal(record.routingMode, 'mixed')
    assert.equal(record.modelRoutingVersion, 1)
    assert.equal(record.modelRoutingSource, 'explicit')
    assert.deepEqual(record.modelRoutes, {
      main: { accessProvider: 'openai', modelId: 'gpt-5.6-sol' },
      image: { accessProvider: 'gemini', modelId: 'gemini-3.1-flash-image' },
      vision: { accessProvider: 'bailian', modelId: 'qwen3.7-plus' },
    })
    assert.equal(record.mainModelName, 'gpt-5.6-sol')
    assert.equal(record.imageModelName, 'gemini-3.1-flash-image')
    assert.equal(record.referenceVisionModelName, 'qwen3.7-plus')
    assert.doesNotMatch(JSON.stringify(record), /main-secret|apiKeys|routeSecrets/)
  } finally {
    legacy.configureRuntimeFetch()
    state.inserts = previousInserts
    state.ossWriteMode = previousWriteMode
  }
})

test('execution DTO builders allowlist complete routing contracts and discard arbitrary secret aliases', async () => {
  const legacy = await loadLegacy()
  const modelRoutes = {
    main: { accessProvider: 'openai', modelId: 'gpt-5.6-sol' },
    image: { accessProvider: 'gemini', modelId: 'gemini-3.1-flash-image' },
    vision: { accessProvider: 'bailian', modelId: 'qwen3.7-plus' },
  }
  const routing = {
    provider: 'openai', modelRoutes, routingMode: 'mixed', modelRoutingVersion: 1,
    modelRoutingSource: 'explicit', mainModelName: 'gpt-5.6-sol',
    imageModelName: 'gemini-3.1-flash-image', referenceVisionModelName: 'qwen3.7-plus',
  }
  const secretAliases = {
    apiKeys: { openai: 'official-secret' },
    api_keys: ['array-secret'],
    apiKey: 'singular-secret',
    authorization: 'Bearer authorization-secret',
    accessToken: 'access-token-secret',
    nestedCredentials: { token: 'nested-secret' },
    prevalidatedManualReferences: [{
      id: 'caller-controlled-reference',
      api_keys: ['nested-reference-api-key'],
      credentials: { password: 'nested-reference-password' },
    }],
    imageRefineMode: 'direct-edit',
    imageRefineReason: 'caller-controlled-capability',
  }

  const create = legacy.toCreateExecutionBody({
    action: 'createJob', ...routing, ...secretAliases,
    configurationMode: 'advanced', methodContent: 'Allowed method', caption: 'Allowed caption',
    outputFormat: 'png', referenceImages: [], pipelineMode: 'vanilla', retrievalSetting: 'none',
  })
  const refine = legacy.toRefineExecutionBody({
    action: 'refineImage', ...routing, ...secretAliases,
    configurationMode: 'simple', sourceImageObjectKey: 'owned/source.png', editInstruction: 'Improve labels.',
    refineMode: 'direct-edit', refineReason: 'Supported',
  })

  for (const executionBody of [create, refine]) {
    assert.deepEqual(executionBody.modelRoutes, modelRoutes)
    assert.equal(executionBody.routingMode, 'mixed')
    assert.equal(executionBody.modelRoutingVersion, 1)
    assert.equal(executionBody.modelRoutingSource, 'explicit')
    assert.doesNotMatch(
      JSON.stringify(executionBody),
      /official-secret|array-secret|singular-secret|authorization-secret|access-token-secret|nested-secret|apiKeys|api_keys|authorization|accessToken|nestedCredentials/,
    )
  }
  assert.equal(create.methodContent, 'Allowed method')
  assert.equal(Object.hasOwn(create, 'prevalidatedManualReferences'), false)
  assert.equal(Object.hasOwn(create, 'imageRefineMode'), false)
  assert.equal(Object.hasOwn(create, 'imageRefineReason'), false)
  assert.doesNotMatch(JSON.stringify(create), /nested-reference-api-key|nested-reference-password|caller-controlled-reference/)
  assert.equal(refine.sourceImageObjectKey, 'owned/source.png')
  assert.equal(refine.configurationMode, 'simple')
})

test('route secret selection keeps only providers reachable by the requested stages', async () => {
  const legacy = await loadLegacy()
  const routes = {
    main: { accessProvider: 'openai', modelId: 'gpt-5.6-sol' },
    image: { accessProvider: 'gemini', modelId: 'gemini-3.1-flash-image' },
    vision: { accessProvider: 'bailian', modelId: 'qwen3.7-plus' },
  }
  const keys = { openai: 'main-secret', gemini: 'image-secret', bailian: 'vision-secret', openrouter: 'unused-secret' }

  assert.deepEqual(legacy.requiredCreateRouteRoles({ outputFormat: 'svg', retrievalSetting: 'none' }, 0), ['main'])
  assert.deepEqual(legacy.requiredCreateRouteRoles({ outputFormat: 'png', pipelineMode: 'vanilla', retrievalSetting: 'none', imageSize: '1K' }, 1), ['image'])
  assert.deepEqual(legacy.requiredCreateRouteRoles({ outputFormat: 'png', pipelineMode: 'planner_critic', retrievalSetting: 'auto', imageSize: '2K' }, 1), ['main', 'image', 'vision'])
  assert.deepEqual(legacy.requiredCreateRouteRoles({ taskName: 'plot', outputFormat: 'svg', pipelineMode: 'planner_critic', imageSize: '1K' }, 1), ['main', 'vision'])
  assert.deepEqual(legacy.requiredRefineRouteRoles({ refineMode: 'direct-edit' }), ['image'])
  assert.deepEqual(legacy.requiredRefineRouteRoles({ refineMode: 'analyze-redraw' }), ['vision', 'image'])
  assert.deepEqual(legacy.selectRequiredRouteSecrets(routes, keys, ['main']), { openai: 'main-secret' })
  assert.deepEqual(legacy.selectRequiredRouteSecrets(routes, keys, ['vision', 'image']), {
    bailian: 'vision-secret',
    gemini: 'image-secret',
  })
})

test('high-resolution plot reaches the image route only for a resolved direct-edit capability', async () => {
  const legacy = await loadLegacy()

  assert.deepEqual(legacy.requiredCreateRouteRoles({
    taskName: 'plot', outputFormat: 'png', pipelineMode: 'planner_critic', imageSize: '2K', imageRefineMode: 'analyze-redraw',
  }, 1), ['main', 'vision'])
  assert.deepEqual(legacy.requiredCreateRouteRoles({
    taskName: 'plot', outputFormat: 'png', pipelineMode: 'planner_critic', imageSize: '4K', imageRefineMode: 'direct-edit',
  }, 1), ['main', 'image', 'vision'])
})

test('registry role validation rejects a non-selectable entry even when its role metadata is present', async () => {
  const legacy = await loadLegacy()
  const error = legacy.modelRoleSelectionError('openai', {
    models: [{ id: 'disabled-main', roles: ['main'], selectable: false }],
  }, [{ model: 'disabled-main', role: 'main' }])

  assert.match(error, /not selectable for main/)
})

test('legacy high-resolution plot ignores caller-forged direct-edit capability', async () => {
  const legacy = await loadLegacy()
  const state = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  const previousInserts = state.inserts
  state.inserts = []
  legacy.configureRuntimeFetch(async () => new Response('provider failed', { status: 400 }))
  try {
    const queued = await legacy.default({
      request: { method: 'POST' },
      body: {
        action: 'createJob', provider: 'bailian', apiKeys: { bailian: 'main-route-secret' },
        methodContent: 'A sufficiently detailed methodology for a legacy high-resolution statistical plot.',
        caption: 'Ignore forged image capability.', taskName: 'plot', outputFormat: 'png', imageSize: '2K',
        retrievalSetting: 'none', maxCriticRounds: 0, mainModelName: 'qwen3.7-plus', imageModelName: 'qwen3.8-max',
        imageRefineMode: 'direct-edit', imageRefineReason: 'caller-forged',
      },
      headers: {}, response: { setHeader() {}, status() {} },
    })
    assert.equal(queued.code, 0, JSON.stringify(queued))
    assert.equal(state.inserts.length, 1)
    assert.equal(state.inserts[0].imageRefineMode, 'none')
    await legacy.drainJobAdmission()
  } finally {
    legacy.configureRuntimeFetch()
    state.inserts = previousInserts
  }
})

test('mixed high-resolution plot accepts a valid analyze-redraw image route without its provider key', async () => {
  const legacy = await loadLegacy()
  const state = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  const previousInserts = state.inserts
  state.inserts = []
  legacy.configureRuntimeFetch(async () => new Response('provider failed', { status: 400 }))
  try {
    const queued = await legacy.default({
      request: { method: 'POST' },
      body: {
        action: 'createJob', provider: 'openai', configurationMode: 'advanced',
        apiKeys: { openai: 'main-route-secret', gemini: 'vision-route-secret' },
        methodContent: 'A sufficiently detailed methodology for a mixed high-resolution statistical plot.',
        caption: 'Mixed plot capability routing.', taskName: 'plot', outputFormat: 'png', imageSize: '2K',
        retrievalSetting: 'none', maxCriticRounds: 1,
        modelRoutes: {
          main: { accessProvider: 'openai', modelId: 'gpt-5.6-sol' },
          image: { accessProvider: 'bailian', modelId: 'z-image-turbo' },
          vision: { accessProvider: 'gemini', modelId: 'gemini-3.7-flash' },
        },
      },
      headers: {}, response: { setHeader() {}, status() {} },
    })
    assert.equal(queued.code, 0, JSON.stringify(queued))
    assert.equal(state.inserts.length, 1)
    assert.equal(state.inserts[0].imageRefineMode, 'analyze-redraw')
    await legacy.drainJobAdmission()
  } finally {
    legacy.configureRuntimeFetch()
    state.inserts = previousInserts
  }
})

test('explicit maxCriticRounds zero adds no vision key, call, or critic stage', async () => {
  const legacy = await loadLegacy()
  const state = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  const previousWriteMode = state.ossWriteMode
  const previousInserts = state.inserts
  const previousUpdates = state.updates
  const calls: string[] = []
  state.ossWriteMode = 'success'
  state.inserts = []
  state.updates = []
  legacy.configureRuntimeFetch(async (input) => {
    const url = String(input)
    calls.push(url)
    if (url.includes('dashscope.aliyuncs.com/compatible-mode/v1/chat/completions')) {
      return Response.json({ choices: [{ message: { content: 'A clear academic diagram description.' } }] })
    }
    if (url.includes('generativelanguage.googleapis.com/v1beta/interactions')) {
      return Response.json({ output_image: { data: Buffer.alloc(120, 4).toString('base64'), mime_type: 'image/png' } })
    }
    throw new Error(`unexpected zero-critic dispatch ${url}`)
  })
  try {
    const queued = await legacy.default({
      request: { method: 'POST' },
      body: {
        action: 'createJob', provider: 'bailian', configurationMode: 'advanced',
        apiKeys: { bailian: 'main-route-secret', gemini: 'image-route-secret' },
        methodContent: 'A sufficiently detailed methodology for explicit zero-critic execution verification.',
        caption: 'Zero critic execution.', outputFormat: 'png', imageSize: '1K', pipelineMode: 'planner_critic',
        retrievalSetting: 'none', maxCriticRounds: 0,
        modelRoutes: {
          main: { accessProvider: 'bailian', modelId: 'qwen3.7-plus' },
          image: { accessProvider: 'gemini', modelId: 'gemini-3.1-flash-image' },
          vision: { accessProvider: 'openai', modelId: 'gpt-5.4-pro' },
        },
      },
      headers: {}, response: { setHeader() {}, status() {} },
    })
    assert.equal(queued.code, 0, JSON.stringify(queued))
    assert.equal(state.inserts[0].maxCriticRounds, 0)
    await legacy.drainJobAdmission()
    assert.deepEqual(calls.map((url) => new URL(url).hostname), [
      'dashscope.aliyuncs.com',
      'generativelanguage.googleapis.com',
    ])
    const pushedStages = state.updates.flatMap((entry: any) => entry.update?.$push?.stages ? [entry.update.$push.stages] : [])
    assert.equal(pushedStages.some((stage: any) => stage.type === 'critic'), false)
    const terminalStatuses = state.updates
      .map((entry: any) => entry.update?.$set?.status)
      .filter((status: unknown) => status === 'succeeded' || status === 'failed')
    assert.deepEqual(terminalStatuses, ['succeeded'])
  } finally {
    legacy.configureRuntimeFetch()
    state.ossWriteMode = previousWriteMode
    state.inserts = previousInserts
    state.updates = previousUpdates
  }
})

test('a visual critic download timeout retries once, then keeps the last successful render and completes the job', async () => {
  const legacy = await loadLegacy()
  const state = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  const previousWriteMode = state.ossWriteMode
  const previousOssWrites = state.ossWrites
  const previousInserts = state.inserts
  const previousUpdates = state.updates
  state.ossWriteMode = 'success'
  state.ossWrites = []
  state.inserts = []
  state.updates = []
  let criticCalls = 0
  legacy.configureRuntimeFetch(async (input, init) => {
    const url = String(input)
    if (url.includes('dashscope.aliyuncs.com/compatible-mode/v1/chat/completions')) {
      const payload = JSON.parse(String(init?.body || '{}'))
      const userContent = payload.messages?.[1]?.content
      if (Array.isArray(userContent)) {
        criticCalls += 1
        return Response.json(
          { code: 'InternalError.Algo.InvalidParameter', message: 'Download multimodal file timed out' },
          { status: 400 },
        )
      }
      return Response.json({ choices: [{ message: { content: 'A clear academic diagram description.' } }] })
    }
    if (url.includes('dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation')) {
      return Response.json({
        output: { choices: [{ message: { content: [{ image: 'https://images.invalid/generated.png' }] } }] },
      })
    }
    if (url === 'https://images.invalid/generated.png') {
      return new Response(Buffer.from(onePixelPngBase64, 'base64'), {
        headers: { 'Content-Type': 'image/png' },
      })
    }
    throw new Error(`unexpected critic fallback dispatch ${url}`)
  })
  try {
    const queued = await legacy.default({
      request: { method: 'POST' },
      body: {
        action: 'createJob', provider: 'bailian', configurationMode: 'advanced',
        apiKeys: { bailian: 'route-secret' },
        methodContent: 'A sufficiently detailed methodology for visual critic fallback verification.',
        caption: 'Visual critic fallback verification.', outputFormat: 'png', imageSize: '1K',
        pipelineMode: 'planner_critic', retrievalSetting: 'none', maxCriticRounds: 1,
        modelRoutes: {
          main: { accessProvider: 'bailian', modelId: 'qwen3.8-max' },
          image: { accessProvider: 'bailian', modelId: 'wan2.7-image-pro' },
          vision: { accessProvider: 'bailian', modelId: 'qwen3.7-plus' },
        },
      },
      headers: {}, response: { setHeader() {}, status() {} },
    })
    assert.equal(queued.code, 0, JSON.stringify(queued))
    await legacy.drainJobAdmission()

    assert.equal(criticCalls, 2)
    const terminalUpdates = state.updates.filter((entry: any) =>
      entry.update?.$set?.status === 'succeeded' || entry.update?.$set?.status === 'failed')
    assert.deepEqual(terminalUpdates.map((entry: any) => entry.update.$set.status), ['succeeded'])
    assert.equal(terminalUpdates[0].update.$set.resultImages.length, 1)
    assert.match(terminalUpdates[0].update.$set.resultImages[0].objectKey, /candidate-0\.png$/)

    const logs = state.updates
      .map((entry: any) => entry.update?.$push?.logs)
      .filter(Boolean)
      .join('\n')
    assert.match(logs, /critic round 1 failed, keeping last render/i)
    assert.match(logs, /Download multimodal file timed out/)

    const criticStage = state.updates
      .map((entry: any) => entry.update?.$push?.stages)
      .find((stage: any) => stage?.type === 'critic')
    assert.equal(criticStage.title, '图像评审（第1轮，已跳过）')
    assert.match(criticStage.error, /Download multimodal file timed out/)
    assert.match(criticStage.image?.filename || '', /candidate-0-render-0\.png$/)
  } finally {
    legacy.configureRuntimeFetch()
    state.ossWriteMode = previousWriteMode
    state.ossWrites = previousOssWrites
    state.inserts = previousInserts
    state.updates = previousUpdates
  }
})

test('a plot critic download timeout retries once, then keeps the last successful plot and completes the job', async () => {
  const legacy = await loadLegacy()
  const state = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  const previousPlotWorkerUrl = process.env.PLOT_WORKER_URL
  const previousWriteMode = state.ossWriteMode
  const previousOssWrites = state.ossWrites
  const previousInserts = state.inserts
  const previousUpdates = state.updates
  process.env.PLOT_WORKER_URL = 'https://plot.invalid'
  state.ossWriteMode = 'success'
  state.ossWrites = []
  state.inserts = []
  state.updates = []
  let textCalls = 0
  let criticCalls = 0
  legacy.configureRuntimeFetch(async (input, init) => {
    const url = String(input)
    if (url.includes('dashscope.aliyuncs.com/compatible-mode/v1/chat/completions')) {
      const payload = JSON.parse(String(init?.body || '{}'))
      const userContent = payload.messages?.[1]?.content
      if (Array.isArray(userContent)) {
        criticCalls += 1
        return Response.json(
          { code: 'InternalError.Algo.InvalidParameter', message: 'Download multimodal file timed out' },
          { status: 400 },
        )
      }
      textCalls += 1
      const content = textCalls === 1
        ? 'A clear statistical plot description.'
        : 'import matplotlib.pyplot as plt\nplt.plot([1, 2], [1, 2])'
      return Response.json({ choices: [{ message: { content } }] })
    }
    if (url === 'https://plot.invalid/render') {
      return Response.json({ ok: true, image_base64: onePixelPngBase64 })
    }
    throw new Error(`unexpected plot critic fallback dispatch ${url}`)
  })
  try {
    const queued = await legacy.default({
      request: { method: 'POST' },
      body: {
        action: 'createJob', provider: 'bailian', configurationMode: 'advanced',
        apiKeys: { bailian: 'route-secret' },
        methodContent: 'A sufficiently detailed methodology for plot critic fallback verification.',
        caption: 'Plot critic fallback verification.', taskName: 'plot', outputFormat: 'png', imageSize: '1K',
        pipelineMode: 'planner_critic', retrievalSetting: 'none', maxCriticRounds: 1,
        modelRoutes: {
          main: { accessProvider: 'bailian', modelId: 'qwen3.7-plus' },
          image: { accessProvider: 'bailian', modelId: 'wan2.7-image-pro' },
          vision: { accessProvider: 'bailian', modelId: 'qwen3.7-plus' },
        },
      },
      headers: {}, response: { setHeader() {}, status() {} },
    })
    assert.equal(queued.code, 0, JSON.stringify(queued))
    await legacy.drainJobAdmission()

    assert.equal(criticCalls, 2)
    const terminalUpdates = state.updates.filter((entry: any) =>
      entry.update?.$set?.status === 'succeeded' || entry.update?.$set?.status === 'failed')
    assert.deepEqual(terminalUpdates.map((entry: any) => entry.update.$set.status), ['succeeded'])
    assert.equal(terminalUpdates[0].update.$set.resultImages.length, 1)

    const criticStage = state.updates
      .map((entry: any) => entry.update?.$push?.stages)
      .find((stage: any) => stage?.type === 'critic')
    assert.equal(criticStage.title, '统计图评审（第1轮，已跳过）')
    assert.match(criticStage.error, /Download multimodal file timed out/)
    assert.match(criticStage.image?.filename || '', /candidate-0-plot-render-0\.png$/)
  } finally {
    legacy.configureRuntimeFetch()
    if (previousPlotWorkerUrl === undefined) delete process.env.PLOT_WORKER_URL
    else process.env.PLOT_WORKER_URL = previousPlotWorkerUrl
    state.ossWriteMode = previousWriteMode
    state.ossWrites = previousOssWrites
    state.inserts = previousInserts
    state.updates = previousUpdates
  }
})

test('legacy create keeps main-only Bailian models valid when no vision stage was explicitly selected', async () => {
  const legacy = await loadLegacy()
  const state = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  const previousInserts = state.inserts
  state.inserts = []
  legacy.configureRuntimeFetch(async () => new Response('provider failed', { status: 400 }))
  try {
    const queued = await legacy.default({
      request: { method: 'POST' },
      body: {
        action: 'createJob', provider: 'bailian', apiKeys: { bailian: 'legacy-key' },
        methodContent: 'A sufficiently detailed legacy method using a main-only Bailian model.',
        caption: 'Legacy main-only model compatibility.', outputFormat: 'svg', maxCriticRounds: 0,
        mainModelName: 'deepseek-v4-pro', imageModelName: 'z-image-turbo', retrievalSetting: 'none',
      },
      headers: {}, response: { setHeader() {}, status() {} },
    })
    assert.equal(queued.code, 0, JSON.stringify(queued))
    await legacy.drainJobAdmission()
    assert.equal(state.inserts.length, 1)
    assert.equal(state.inserts[0].modelRoutingSource, 'legacy-derived')
  } finally {
    legacy.configureRuntimeFetch()
    state.inserts = previousInserts
  }
})

test('legacy create validates the exact execution-required vision role before persistence', async () => {
  const legacy = await loadLegacy()
  const state = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  const previousInserts = state.inserts
  state.inserts = []
  const invoke = (mainModelName: string, maxCriticRounds: number) => legacy.default({
    request: { method: 'POST' },
    body: {
      action: 'createJob', provider: 'bailian', apiKeys: { bailian: 'legacy-key' },
      methodContent: 'A sufficiently detailed legacy method for exact reachable role validation.',
      caption: 'Validate reachable legacy vision.', outputFormat: 'png', pipelineMode: 'planner_critic',
      maxCriticRounds, mainModelName, imageModelName: 'wan2.7-image-pro', retrievalSetting: 'none',
    },
    headers: {}, response: { setHeader() {}, status() {} },
  })
  legacy.configureRuntimeFetch(async () => new Response('provider failed', { status: 400 }))
  try {
    const incompatible = await invoke('deepseek-v4-pro-0813', 1)
    assert.equal(incompatible.code, 400)
    assert.match(incompatible.error, /deepseek-v4-pro-0813 is not registered for vision/)
    assert.equal(state.inserts.length, 0)

    const compatible = await invoke('qwen3.8-max', 1)
    assert.equal(compatible.code, 0, JSON.stringify(compatible))
    assert.equal(state.inserts.length, 1)
    await legacy.drainJobAdmission()
  } finally {
    legacy.configureRuntimeFetch()
    state.inserts = previousInserts
  }
})

test('legacy analyze-redraw refine validates its derived vision role and preserves compatible routing', async () => {
  const legacy = await loadLegacy()
  const state = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  const previousInserts = state.inserts
  const previousStoredObjects = state.storedObjectBytes
  state.inserts = []
  state.storedObjectBytes = { 'owned/refine.png': Buffer.from('source') }
  const invoke = (mainModelName: string) => legacy.default({
    request: { method: 'POST' },
    body: {
      action: 'refineImage', provider: 'bailian', apiKeys: { bailian: 'legacy-key' },
      mainModelName, imageModelName: 'z-image-turbo', sourceImageObjectKey: 'owned/refine.png',
      editInstruction: 'Improve labels while preserving all content.',
    },
    headers: {}, response: { setHeader() {}, status() {} },
  })
  legacy.configureRuntimeFetch(async () => new Response('provider failed', { status: 400 }))
  try {
    const incompatible = await invoke('deepseek-v4-pro-0813')
    assert.equal(incompatible.code, 400)
    assert.match(incompatible.error, /deepseek-v4-pro-0813 is not registered for vision/)
    assert.equal(state.inserts.length, 0)

    const compatible = await invoke('qwen3.8-max')
    assert.equal(compatible.code, 0, JSON.stringify(compatible))
    assert.equal(state.inserts.length, 1)
    await legacy.drainJobAdmission()
  } finally {
    legacy.configureRuntimeFetch()
    state.inserts = previousInserts
    state.storedObjectBytes = previousStoredObjects
  }
})

test('explicit direct refine rejects invalid unused main and vision routes without requiring their keys', async () => {
  const legacy = await loadLegacy()
  const state = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  const previousInserts = state.inserts
  const previousStoredObjects = state.storedObjectBytes
  state.inserts = []
  state.storedObjectBytes = { 'owned/explicit-direct.png': Buffer.from('source') }
  const base = {
    action: 'refineImage', provider: 'openai', configurationMode: 'advanced',
    apiKeys: { gemini: 'image-route-secret' }, sourceImageObjectKey: 'owned/explicit-direct.png',
    editInstruction: 'Improve label clarity while preserving all content.',
    modelRoutes: {
      main: { accessProvider: 'openai', modelId: 'gpt-5.6-sol' },
      image: { accessProvider: 'gemini', modelId: 'gemini-3.1-flash-image' },
      vision: { accessProvider: 'bailian', modelId: 'qwen3.7-plus' },
    },
  }
  const invoke = (modelRoutes: Record<string, unknown>) => legacy.default({
    request: { method: 'POST' }, body: { ...base, modelRoutes }, headers: {}, response: { setHeader() {}, status() {} },
  })
  legacy.configureRuntimeFetch(async () => new Response('provider failed', { status: 400 }))
  try {
    const wrongMain = await invoke({
      ...base.modelRoutes,
      main: { accessProvider: 'openai', modelId: 'gpt-image-2' },
    })
    await legacy.drainJobAdmission()
    const wrongVision = await invoke({
      ...base.modelRoutes,
      vision: { accessProvider: 'bailian', modelId: 'wan2.7-image-pro' },
    })
    await legacy.drainJobAdmission()

    assert.equal(wrongMain.code, 400)
    assert.match(wrongMain.error, /not registered for main/)
    assert.equal(wrongVision.code, 400)
    assert.match(wrongVision.error, /not registered for vision/)
  } finally {
    legacy.configureRuntimeFetch()
    state.inserts = previousInserts
    state.storedObjectBytes = previousStoredObjects
  }
})

test('explicit auto reference routing defaults to vision while legacy auto retains main-model compatibility', async () => {
  const legacy = await loadLegacy()
  const routes = {
    main: { accessProvider: 'gemini', modelId: 'gemini-3.6-flash' },
    image: { accessProvider: 'gemini', modelId: 'gemini-3.1-flash-image' },
    vision: { accessProvider: 'bailian', modelId: 'qwen3.7-plus' },
  }
  const common = {
    provider: 'gemini', mainModelName: 'gemini-3.6-flash', imageModelName: 'gemini-3.1-flash-image',
    referenceVisionModelName: 'qwen3.7-plus', modelRoutes: routes, referenceImageMode: 'auto', referenceImages: [{}],
  }
  assert.deepEqual(await legacy.resolveReferenceImageMode({ ...common, modelRoutingSource: 'explicit' }), {
    referenceImageMode: 'auto',
    referenceImageModeUsed: 'vision_model',
  })
  const legacyMode = await legacy.resolveReferenceImageMode({ ...common, modelRoutingSource: 'legacy-derived' })
  assert.equal(legacyMode.referenceImageModeUsed, 'main_model')
})

test('pipeline dispatches model work through role routes instead of the top-level provider shadow', () => {
  const source = fs.readFileSync(legacyPath, 'utf8')
  const section = (start: string, end: string) => source.slice(source.indexOf(start), source.indexOf(end))

  const candidate = section('async function runCandidate(', 'async function runPlotCandidate(')
  assert.match(candidate, /modelRouteAccess\(body, routeSecrets, nativeVector \? 'image' : 'main'\)/)
  assert.match(candidate, /modelRouteAccess\(body, routeSecrets, 'image'\)/)
  assert.doesNotMatch(candidate, /call(?:Text|Image|Svg)Model\(body\.provider/)

  const visualCritic = section('async function critiqueRenderedDiagram(', 'function isNoChangesSignal(')
  assert.match(visualCritic, /modelRouteAccess\(body, routeSecrets, 'vision'\)/)
  assert.match(visualCritic, /modelRouteAccess\(body, routeSecrets, 'main'\)/)

  const referenceAnalysis = section('async function analyzeReferenceImages(', 'async function buildVisionImageInputs(')
  assert.match(referenceAnalysis, /modelRouteAccess\(body, routeSecrets, 'vision'\)/)
  assert.doesNotMatch(referenceAnalysis, /callVisionModel\(\s*body\.provider/)

  const refine = section('async function runRefineJob(', 'export async function resolveRetrievedReferences(')
  assert.match(refine, /modelRouteAccess\(body, routeSecrets, 'vision'\)/)
  assert.match(refine, /modelRouteAccess\(body, routeSecrets, 'image'\)/)
  assert.doesNotMatch(refine, /call(?:Text|Image)Model\(body\.provider/)

  const plotWorker = section('async function renderPlotViaWorker(', 'async function pingPlotWorker(')
  assert.doesNotMatch(plotWorker, /apiKey|routeSecrets|modelRouteAccess/)
})

test('mixed create dispatches main, image, and visual critic calls with only their route credentials', async () => {
  const legacy = await loadLegacy()
  const state = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  const previousWriteMode = state.ossWriteMode
  const previousInserts = state.inserts
  const calls: Array<{ url: string; authorization: string; googleKey: string }> = []
  state.ossWriteMode = 'success'
  state.inserts = []
  legacy.configureRuntimeFetch(async (input, init) => {
    const url = String(input)
    const headers = new Headers(init?.headers)
    calls.push({
      url,
      authorization: headers.get('authorization') || '',
      googleKey: headers.get('x-goog-api-key') || '',
    })
    if (url.includes('dashscope.aliyuncs.com/compatible-mode/v1/chat/completions')) {
      return Response.json({ choices: [{ message: { content: 'A clear academic diagram description.' } }] })
    }
    if (url.includes('generativelanguage.googleapis.com/v1beta/interactions')) {
      return Response.json({ output_image: { data: Buffer.alloc(120, 1).toString('base64'), mime_type: 'image/png' } })
    }
    if (url === 'https://api.openai.com/v1/responses') {
      return Response.json({ output_text: '{"critic_suggestions":"","revised_description":"No changes needed."}' })
    }
    throw new Error(`unexpected dispatch ${url}`)
  })
  try {
    const queued = await legacy.default({
      request: { method: 'POST' },
      body: {
        action: 'createJob', provider: 'bailian', configurationMode: 'advanced',
        apiKeys: { bailian: 'main-route-secret', gemini: 'image-route-secret', openai: 'vision-route-secret', openrouter: 'unused-secret' },
        methodContent: 'A sufficiently detailed methodology for runtime provider route dispatch verification.',
        caption: 'Runtime route dispatch verification.', outputFormat: 'png', imageSize: '1K',
        retrievalSetting: 'none', maxCriticRounds: 1,
        modelRoutes: {
          main: { accessProvider: 'bailian', modelId: 'qwen3.7-plus' },
          image: { accessProvider: 'gemini', modelId: 'gemini-3.1-flash-image' },
          vision: { accessProvider: 'openai', modelId: 'gpt-5.4-pro' },
        },
      },
      headers: {}, response: { setHeader() {}, status() {} },
    })
    assert.equal(queued.code, 0, JSON.stringify(queued))
    await legacy.drainJobAdmission()

    assert.deepEqual(calls.map((call) => [new URL(call.url).hostname, call.authorization, call.googleKey]), [
      ['dashscope.aliyuncs.com', 'Bearer main-route-secret', ''],
      ['generativelanguage.googleapis.com', '', 'image-route-secret'],
      ['api.openai.com', 'Bearer vision-route-secret', ''],
    ])
    assert.doesNotMatch(JSON.stringify(calls), /unused-secret/)
  } finally {
    legacy.configureRuntimeFetch()
    state.ossWriteMode = previousWriteMode
    state.inserts = previousInserts
  }
})

test('refine dispatch retains image only for direct edit and vision plus image for analyze-redraw', async () => {
  const legacy = await loadLegacy()
  const state = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  const previousWriteMode = state.ossWriteMode
  const previousStoredObjects = state.storedObjectBytes
  const previousInserts = state.inserts
  state.ossWriteMode = 'success'
  state.storedObjectBytes = {
    'owned/direct.png': Buffer.from('direct-source'),
    'owned/analyze.png': Buffer.from('analyze-source'),
  }
  state.inserts = []
  const calls: Array<{ url: string; authorization: string; googleKey: string; body: any }> = []
  legacy.configureRuntimeFetch(async (input, init) => {
    const url = String(input)
    const headers = new Headers(init?.headers)
    calls.push({
      url,
      authorization: headers.get('authorization') || '',
      googleKey: headers.get('x-goog-api-key') || '',
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body,
    })
    if (url.includes('generativelanguage.googleapis.com/v1beta/interactions')) {
      return Response.json({ output_image: { data: Buffer.alloc(120, 2).toString('base64'), mime_type: 'image/png' } })
    }
    if (url === 'https://api.openai.com/v1/responses') {
      return Response.json({ output_text: 'Preserve the source composition and improve label clarity.' })
    }
    if (url.includes('dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation')) {
      return Response.json({ output: { choices: [{ message: { content: [{ image: 'https://cdn.invalid/refined.png' }] } }] } })
    }
    if (url === 'https://cdn.invalid/refined.png') return new Response(Buffer.alloc(120, 3), { headers: { 'Content-Type': 'image/png' } })
    throw new Error(`unexpected dispatch ${url}`)
  })
  const invoke = (body: Record<string, unknown>) => legacy.default({
    request: { method: 'POST' }, body, headers: {}, response: { setHeader() {}, status() {} },
  })
  try {
    const direct = await invoke({
      action: 'refineImage', provider: 'bailian', configurationMode: 'advanced',
      apiKeys: { gemini: 'direct-image-secret' }, sourceImageObjectKey: 'owned/direct.png', editInstruction: 'Make labels clearer.',
      imageSize: '4K',
      modelRoutes: {
        main: { accessProvider: 'bailian', modelId: 'qwen3.7-plus' },
        image: { accessProvider: 'gemini', modelId: 'gemini-3.1-flash-image' },
        vision: { accessProvider: 'openai', modelId: 'gpt-5.4-pro' },
      },
    })
    assert.equal(direct.code, 0, JSON.stringify(direct))
    await legacy.drainJobAdmission()
    assert.deepEqual(calls.map((call) => [new URL(call.url).hostname, call.authorization, call.googleKey]), [
      ['generativelanguage.googleapis.com', '', 'direct-image-secret'],
    ])
    assert.equal(calls[0].body.response_format.image_size, '4K')

    calls.length = 0
    const analyzed = await invoke({
      action: 'refineImage', provider: 'gemini', configurationMode: 'advanced',
      apiKeys: { openai: 'analyze-vision-secret', bailian: 'redraw-image-secret' },
      sourceImageObjectKey: 'owned/analyze.png', editInstruction: 'Improve contrast without changing content.',
      modelRoutes: {
        main: { accessProvider: 'gemini', modelId: 'gemini-3.6-flash' },
        image: { accessProvider: 'bailian', modelId: 'z-image-turbo' },
        vision: { accessProvider: 'openai', modelId: 'gpt-5.4-pro' },
      },
    })
    assert.equal(analyzed.code, 0, JSON.stringify(analyzed))
    assert.equal(analyzed.refineCapability.mode, 'analyze-redraw')
    await legacy.drainJobAdmission()
    assert.deepEqual(calls.map((call) => [call.url, call.authorization, call.googleKey]), [
      ['https://api.openai.com/v1/responses', 'Bearer analyze-vision-secret', ''],
      ['https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', 'Bearer redraw-image-secret', ''],
      ['https://cdn.invalid/refined.png', '', ''],
    ])
    const source = fs.readFileSync(legacyPath, 'utf8')
    assert.match(source, /callImageModel\(imageRoute\.provider, imageRoute\.model, imageRoute\.apiKey, editPrompt, body\.aspectRatio \|\| '16:9', sourceUrl, body\.imageSize \|\| '2K', true, imageRoute\.region\)/)
    assert.match(source, /callImageModel\(imageRoute\.provider, imageRoute\.model, imageRoute\.apiKey, diagramPromptFromDescription\(description\), body\.aspectRatio \|\| '16:9', '', body\.imageSize \|\| '2K', true, imageRoute\.region\)/)
  } finally {
    legacy.configureRuntimeFetch()
    state.ossWriteMode = previousWriteMode
    state.storedObjectBytes = previousStoredObjects
    state.inserts = previousInserts
    state.deletedOwnerKeys = []
  }
})

test('analyze-redraw refinement preserves an explicitly requested canonical 1K size', async () => {
  const legacy = await loadLegacy()
  const state = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  const previousWriteMode = state.ossWriteMode
  const previousStoredObjects = state.storedObjectBytes
  const previousInserts = state.inserts
  state.ossWriteMode = 'success'
  state.storedObjectBytes = { 'owned/analyze-1k.png': Buffer.from('analyze-source') }
  state.inserts = []
  const calls: Array<{ url: string; body: any }> = []
  legacy.configureRuntimeFetch(async (input, init) => {
    const url = String(input)
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
    calls.push({ url, body })
    if (url.endsWith('/chat/completions')) {
      return Response.json({ choices: [{ message: { content: 'Preserve the exact composition and improve label clarity.' } }] })
    }
    if (url.includes('/multimodal-generation/generation')) {
      return Response.json({ output: { choices: [{ message: { content: [{ image: 'https://cdn.invalid/analyze-1k.png' }] } }] } })
    }
    if (url === 'https://cdn.invalid/analyze-1k.png') {
      return new Response(Buffer.alloc(120, 5), { headers: { 'Content-Type': 'image/png' } })
    }
    throw new Error(`unexpected analyze-redraw dispatch ${url}`)
  })
  try {
    const result = await legacy.default({
      request: { method: 'POST' },
      body: {
        action: 'refineImage', provider: 'bailian', apiKeys: { bailian: 'analyze-redraw-secret' },
        mainModelName: 'qwen3.7-plus', imageModelName: 'z-image-turbo',
        sourceImageObjectKey: 'owned/analyze-1k.png', editInstruction: 'Improve label clarity without changing content.',
        imageSize: '1K', aspectRatio: '16:9',
      },
      headers: {}, response: { setHeader() {}, status() {} },
    })
    assert.equal(result.code, 0, JSON.stringify(result))
    await legacy.drainJobAdmission()
    assert.equal(state.inserts[0].imageSize, '1K')
    const render = calls.find((call) => call.url.includes('/multimodal-generation/generation'))
    assert.equal(render?.body.parameters.size, '1360*765')
  } finally {
    legacy.configureRuntimeFetch()
    state.ossWriteMode = previousWriteMode
    state.storedObjectBytes = previousStoredObjects
    state.inserts = previousInserts
    state.deletedOwnerKeys = []
  }
})

test('refinement rejects noncanonical image sizes before persistence or provider dispatch', async () => {
  const legacy = await loadLegacy()
  const state = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  const previousStoredObjects = state.storedObjectBytes
  const previousInserts = state.inserts
  state.storedObjectBytes = { 'owned/invalid-size.png': Buffer.from('source') }
  state.inserts = []
  let providerCalls = 0
  legacy.configureRuntimeFetch(async () => {
    providerCalls += 1
    return Response.json({ output_image: { data: onePixelPngBase64, mime_type: 'image/png' } })
  })
  try {
    for (const imageSize of ['8K', '', null, false, 0]) {
      const result = await legacy.default({
        request: { method: 'POST' },
        body: {
          action: 'refineImage', provider: 'gemini', apiKeys: { gemini: 'invalid-size-secret' },
          mainModelName: 'gemini-3.7-flash', imageModelName: 'gemini-3.1-flash-image',
          sourceImageObjectKey: 'owned/invalid-size.png', editInstruction: 'Improve label clarity.',
          imageSize,
        },
        headers: {}, response: { setHeader() {}, status() {} },
      })
      await legacy.drainJobAdmission()
      assert.deepEqual(result, { code: 400, error: 'Invalid imageSize. Must be 512, 1K, 2K, 4K, or auto.' }, String(imageSize))
    }
    assert.equal(state.inserts.length, 0)
    assert.equal(providerCalls, 0)
  } finally {
    legacy.configureRuntimeFetch()
    state.storedObjectBytes = previousStoredObjects
    state.inserts = previousInserts
    state.deletedOwnerKeys = []
  }
})

test('direct-edit refinement rejects registered but unsupported 4K before persistence or provider dispatch', async () => {
  const legacy = await loadLegacy()
  const state = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  const previousStoredObjects = state.storedObjectBytes
  const previousInserts = state.inserts
  state.storedObjectBytes = {
    'owned/openai-4k.png': Buffer.from('openai-source'),
    'owned/bailian-4k.png': Buffer.from('bailian-source'),
  }
  state.inserts = []
  let providerCalls = 0
  legacy.configureRuntimeFetch(async () => {
    providerCalls += 1
    return new Response('unexpected provider dispatch', { status: 500 })
  })
  const invoke = (body: Record<string, unknown>) => legacy.default({
    request: { method: 'POST' }, body, headers: {}, response: { setHeader() {}, status() {} },
  })
  try {
    const openai = await invoke({
      action: 'refineImage', provider: 'openai', configurationMode: 'advanced', apiKeys: { openai: 'openai-secret' },
      sourceImageObjectKey: 'owned/openai-4k.png', editInstruction: 'Improve label clarity.', imageSize: '4K',
      modelRoutes: {
        main: { accessProvider: 'openai', modelId: 'gpt-5.6-sol' },
        image: { accessProvider: 'openai', modelId: 'gpt-image-1' },
        vision: { accessProvider: 'openai', modelId: 'gpt-5.6-sol' },
      },
    })
    const bailian = await invoke({
      action: 'refineImage', provider: 'bailian', configurationMode: 'advanced', apiKeys: { bailian: 'bailian-secret' },
      sourceImageObjectKey: 'owned/bailian-4k.png', editInstruction: 'Improve label clarity.', imageSize: '4K',
      modelRoutes: {
        main: { accessProvider: 'bailian', modelId: 'qwen3.7-plus' },
        image: { accessProvider: 'bailian', modelId: 'wan2.7-image-pro' },
        vision: { accessProvider: 'bailian', modelId: 'qwen3.7-plus' },
      },
    })
    await legacy.drainJobAdmission()

    for (const [result, route, supported] of [
      [openai, 'openai/gpt-image-1', '1K'],
      [bailian, 'bailian/wan2.7-image-pro', '1K, 2K'],
    ] as const) {
      assert.equal(result.code, 400, JSON.stringify(result))
      assert.equal(result.businessCode, 'REFINE_RESOLUTION_UNSUPPORTED')
      assert.equal(result.error, `Refinement resolution 4K is not supported by ${route}. Supported resolutions: ${supported}.`)
    }
    assert.equal(state.inserts.length, 0)
    assert.equal(providerCalls, 0)
  } finally {
    legacy.configureRuntimeFetch()
    state.storedObjectBytes = previousStoredObjects
    state.inserts = previousInserts
    state.deletedOwnerKeys = []
  }
})

test('analyze-redraw refinement rejects a canonical size absent from generation capabilities', async () => {
  const legacy = await loadLegacy()
  const state = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  const previousStoredObjects = state.storedObjectBytes
  const previousInserts = state.inserts
  state.storedObjectBytes = { 'owned/analyze-4k.png': Buffer.from('analyze-source') }
  state.inserts = []
  let providerCalls = 0
  legacy.configureRuntimeFetch(async () => {
    providerCalls += 1
    return new Response('unexpected provider dispatch', { status: 500 })
  })
  try {
    const result = await legacy.default({
      request: { method: 'POST' },
      body: {
        action: 'refineImage', provider: 'bailian', apiKeys: { bailian: 'analyze-secret' },
        mainModelName: 'qwen3.7-plus', imageModelName: 'z-image-turbo',
        sourceImageObjectKey: 'owned/analyze-4k.png', editInstruction: 'Improve label clarity.', imageSize: '4K',
      },
      headers: {}, response: { setHeader() {}, status() {} },
    })
    await legacy.drainJobAdmission()
    assert.equal(result.code, 400, JSON.stringify(result))
    assert.equal(result.businessCode, 'REFINE_RESOLUTION_UNSUPPORTED')
    assert.equal(
      result.error,
      'Refinement resolution 4K is not supported by bailian/z-image-turbo. Supported resolutions: 1K, 2K.',
    )
    assert.equal(state.inserts.length, 0)
    assert.equal(providerCalls, 0)
  } finally {
    legacy.configureRuntimeFetch()
    state.storedObjectBytes = previousStoredObjects
    state.inserts = previousInserts
    state.deletedOwnerKeys = []
  }
})

test('refine persistence and public DTO preserve normalized configuration mode with a simple legacy default', async () => {
  const legacy = await loadLegacy()
  const state = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  const previousWriteMode = state.ossWriteMode
  const previousStoredObjects = state.storedObjectBytes
  const previousInserts = state.inserts
  const previousGateway = process.env.PAPERBANANA_GATEWAY_TOKEN
  state.ossWriteMode = 'success'
  state.storedObjectBytes = {
    'owned/simple.png': Buffer.from('simple-source'),
    'owned/advanced.png': Buffer.from('advanced-source'),
    'owned/legacy.png': Buffer.from('legacy-source'),
  }
  state.inserts = []
  process.env.PAPERBANANA_GATEWAY_TOKEN = 'refine-mode-gateway'
  legacy.configureRuntimeFetch(async () => Response.json({
    output_image: { data: Buffer.alloc(120, 4).toString('base64'), mime_type: 'image/png' },
  }))
  const invoke = (configurationMode: unknown, sourceImageObjectKey: string) => legacy.default({
    request: { method: 'POST' },
    body: {
      action: 'refineImage', provider: 'gemini', apiKeys: { gemini: 'mode-secret' },
      gatewayToken: 'refine-mode-gateway',
      ...(configurationMode === undefined ? {} : { configurationMode }),
      mainModelName: 'gemini-3.6-flash', imageModelName: 'gemini-3.1-flash-image',
      sourceImageObjectKey, editInstruction: 'Improve label clarity without changing content.',
    },
    headers: {}, response: { setHeader() {}, status() {} },
  })
  try {
    const simple = await invoke('simple', 'owned/simple.png')
    const advanced = await invoke('advanced', 'owned/advanced.png')
    const legacyDefault = await invoke(undefined, 'owned/legacy.png')
    assert.equal(simple.code, 0, JSON.stringify(simple))
    assert.equal(advanced.code, 0, JSON.stringify(advanced))
    assert.equal(legacyDefault.code, 0, JSON.stringify(legacyDefault))
    await legacy.drainJobAdmission()
    assert.deepEqual(state.inserts.map((record: any) => record.configurationMode), ['simple', 'advanced', 'simple'])
    assert.deepEqual(state.inserts.map((record: any) => record.routingMode), ['single', 'single', 'single'])

    for (const [response, expectedMode] of [[simple, 'simple'], [advanced, 'advanced'], [legacyDefault, 'simple']] as const) {
      const detail = await legacy.default({
        request: { method: 'POST' },
        body: { action: 'getJob', jobId: response.jobId, gatewayToken: 'refine-mode-gateway' },
        headers: {}, response: { setHeader() {}, status() {} },
      })
      assert.equal(detail.job.configurationMode, expectedMode)
      assert.equal(detail.job.routingMode, 'single')
    }
  } finally {
    legacy.configureRuntimeFetch()
    state.ossWriteMode = previousWriteMode
    state.storedObjectBytes = previousStoredObjects
    state.inserts = previousInserts
    if (previousGateway === undefined) delete process.env.PAPERBANANA_GATEWAY_TOKEN
    else process.env.PAPERBANANA_GATEWAY_TOKEN = previousGateway
  }
})

test('mixed create and direct refine route Ark stages without substituting models or secrets', async () => {
  const legacy = await loadLegacy()
  const state = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  const previousWriteMode = state.ossWriteMode
  const previousStoredObjects = state.storedObjectBytes
  const previousInserts = state.inserts
  state.ossWriteMode = 'success'
  state.storedObjectBytes = { 'owned/ark-source.png': Buffer.from('ark-source') }
  state.inserts = []
  const calls: Array<{ url: string; model: string; authorization: string }> = []
  legacy.configureRuntimeFetch(async (input, init) => {
    const url = String(input)
    const body = init?.body ? JSON.parse(String(init.body)) : {}
    calls.push({ url, model: body.model, authorization: new Headers(init?.headers).get('authorization') || '' })
    if (url.endsWith('/images/generations')) {
      return Response.json({ data: [{ b64_json: onePixelPngBase64 }] })
    }
    throw new Error(`unexpected Ark route: ${url}`)
  })
  const routes = {
    main: { accessProvider: 'openai', modelId: 'gpt-5.6-sol' },
    image: { accessProvider: 'ark', modelId: 'doubao-seedream-4-0-250828' },
    vision: { accessProvider: 'ark', modelId: 'doubao-seed-2-0-lite-260428' },
  }
  const invoke = (body: Record<string, unknown>) => legacy.default({
    request: { method: 'POST' }, body, headers: {}, response: { setHeader() {}, status() {} },
  })
  try {
    const created = await invoke({
      action: 'createJob', provider: 'openai', configurationMode: 'advanced', apiKeys: { ark: 'ark-stage-secret' },
      methodContent: 'A sufficiently detailed methodology for exact Ark stage routing verification.',
      caption: 'Exact Ark stage routing.', outputFormat: 'png', imageSize: '1K', pipelineMode: 'vanilla',
      retrievalSetting: 'none', maxCriticRounds: 0, modelRoutes: routes,
    })
    assert.equal(created.code, 0, JSON.stringify(created))
    await legacy.drainJobAdmission()
    assert.deepEqual(calls.map((call) => [call.url, call.model, call.authorization]), [[
      'https://ark.cn-beijing.volces.com/api/v3/images/generations',
      'doubao-seedream-4-0-250828',
      'Bearer ark-stage-secret',
    ]])

    calls.length = 0
    const refined = await invoke({
      action: 'refineImage', provider: 'openai', configurationMode: 'advanced', apiKeys: { ark: 'ark-stage-secret' },
      sourceImageObjectKey: 'owned/ark-source.png', editInstruction: 'Improve hierarchy without changing content.',
      imageSize: '4K',
      modelRoutes: routes,
    })
    assert.equal(refined.code, 0, JSON.stringify(refined))
    assert.equal(refined.refineCapability.mode, 'direct-edit')
    await legacy.drainJobAdmission()
    assert.equal(state.inserts.at(-1).imageSize, '4K')
    assert.deepEqual(calls.map((call) => [call.url, call.model, call.authorization]), [
      [
        'https://ark.cn-beijing.volces.com/api/v3/images/generations',
        'doubao-seedream-4-0-250828',
        'Bearer ark-stage-secret',
      ],
    ])
  } finally {
    legacy.configureRuntimeFetch()
    state.ossWriteMode = previousWriteMode
    state.storedObjectBytes = previousStoredObjects
    state.inserts = previousInserts
    state.deletedOwnerKeys = []
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
      aspectRatio: '3:2',
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

test('modelRegistry exposes rich model-level metadata and current direct-provider catalogs', async () => {
  const legacy = await loadLegacy()
  const context = (body: Record<string, unknown>) => ({
    request: { method: 'POST' },
    body,
    headers: {},
    response: { setHeader() {}, status() {} },
  })

  const gemini = await legacy.default(context({ action: 'modelRegistry', provider: 'gemini' }))
  assert.equal(gemini.code, 0)
  assert.match(gemini.registryVersion, /^2026-09-/)
  assert.deepEqual(gemini.providers.gemini.defaults, {
    main: 'gemini-3.7-flash',
    image: 'gemini-3.1-flash-image',
    vision: 'gemini-3.7-flash',
  })
  const geminiModels = new Map<string, any>(gemini.providers.gemini.models.map((model: any) => [model.id, model]))
  assert.equal(geminiModels.has('gemini-3.7-flash'), true)
  assert.equal(geminiModels.get('gemini-3.7-flash')?.recommended, true)
  assert.equal(geminiModels.get('gemini-3.6-flash')?.recommended, false)
  assert.deepEqual(geminiModels.get('gemini-3.6-flash')?.roles, ['main', 'vision'])
  assert.equal(geminiModels.get('gemini-3.6-flash')?.verified, true)
  assert.equal(geminiModels.get('gemini-3.6-flash')?.verificationState, 'registry')
  assert.deepEqual(geminiModels.get('gemini-3.6-flash')?.inputModalities, ['text', 'image'])
  assert.deepEqual(geminiModels.get('gemini-3.6-flash')?.outputModalities, ['text'])
  assert.equal(geminiModels.get('gemini-3.6-flash')?.protocol, 'gemini-generate-content')
  assert.deepEqual(geminiModels.get('gemini-3.1-flash-image')?.roles, ['image'])
  assert.equal(geminiModels.get('gemini-3.1-flash-image')?.capabilities.imageEditMode, 'direct-edit')
  assert.deepEqual(geminiModels.get('gemini-3.1-flash-image')?.capabilities.resolutions, ['512', '1K', '2K', '4K'])
  assert.deepEqual(geminiModels.get('gemini-3.1-flash-lite-image')?.capabilities.resolutions, ['1K'])
  assert.equal(geminiModels.has('gemini-3.1-pro'), false)
  assert.equal(geminiModels.has('gemini-3-flash'), false)

  const bailian = await legacy.default(context({ action: 'modelRegistry', provider: 'bailian' }))
  assert.equal(bailian.code, 0)
  assert.deepEqual(bailian.providers.bailian.defaults, {
    main: 'qwen3.8-max',
    image: 'wan2.7-image-pro',
    vision: 'qwen3.7-plus',
  })
  const bailianModels = new Map<string, any>(bailian.providers.bailian.models.map((model: any) => [model.id, model]))
  for (const current of ['qwen3.8-max', 'qwen3.7-plus', 'qwen3.7-flash', 'glm-5.2', 'kimi/kimi-k3', 'MiniMax/MiniMax-M3', 'qwen-image-3.0-pro', 'qwen-image-2.0-pro', 'qwen-image-2.0', 'z-image-turbo']) {
    assert.equal(bailianModels.has(current), true, current)
  }
  for (const retired of ['qwen3.7-max', 'qwen3.6-flash', 'glm-5.1', 'kimi-k2.6', 'MiniMax/MiniMax-M2.7']) {
    assert.equal(bailianModels.has(retired), true, `${retired} remains officially supported`)
  }
  assert.deepEqual(bailianModels.get('qwen3.8-max')?.roles, ['main', 'vision'])
  assert.equal(bailianModels.get('qwen3.8-max-preview'), undefined)
  assert.deepEqual(bailianModels.get('qwen3.7-plus')?.roles, ['main', 'vision'])
  assert.deepEqual(bailianModels.get('qwen3.7-flash')?.roles, ['main', 'vision'])
  assert.deepEqual(bailianModels.get('MiniMax/MiniMax-M3')?.roles, ['main', 'vision'])
  assert.equal(bailianModels.get('qwen-image-3.0-pro')?.lifecycle, 'invite-only')

  const openai = await legacy.default(context({ action: 'modelRegistry', provider: 'openai' }))
  assert.equal(openai.code, 0)
  assert.deepEqual(openai.providers.openai.defaults, {
    main: 'gpt-5.6-sol',
    image: 'gpt-image-2',
    vision: 'gpt-5.6-sol',
  })
  const openaiModels = new Map<string, any>(openai.providers.openai.models.map((model: any) => [model.id, model]))
  for (const current of ['gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-5.6-luna', 'gpt-5.5', 'gpt-5.5-pro', 'gpt-5.4', 'gpt-5.4-pro', 'gpt-5-mini', 'gpt-4.1', 'gpt-image-2']) {
    assert.equal(openaiModels.has(current), true, current)
  }
  assert.equal(openaiModels.get('gpt-5.5-pro')?.protocol, 'openai-responses')
  assert.equal(openaiModels.get('gpt-5.4-pro')?.protocol, 'openai-responses')
  assert.equal(openaiModels.get('gpt-image-2')?.recommended, true)
  assert.equal(openaiModels.get('gpt-image-2')?.lifecycle, 'stable')
  assert.equal(openaiModels.get('gpt-image-1')?.lifecycle, 'legacy')
  assert.equal(openaiModels.get('gpt-image-1-mini')?.lifecycle, 'legacy')

  for (const [providerName, providerRegistry] of Object.entries({
    gemini: gemini.providers.gemini,
    bailian: bailian.providers.bailian,
    openai: openai.providers.openai,
  })) {
    assert.equal(providerRegistry.routeContractVersion, 1, providerName)
    assert.equal(typeof providerRegistry.accountCatalogRequired, 'boolean', providerName)
    assert.equal(providerRegistry.accessKind, providerName === 'bailian' ? 'aggregator' : 'direct', providerName)
    for (const model of providerRegistry.models) {
      assert.equal(typeof model.officialSourceUrl, 'string', `${providerName}/${model.id}`)
      assert.match(model.officialSourceUrl, /^https:\/\//, `${providerName}/${model.id}`)
      assert.equal(model.releasedAt === null || /^\d{4}-\d{2}-\d{2}$/.test(model.releasedAt), true, `${providerName}/${model.id}`)
    }
  }

  const openaiOrdered = openai.providers.openai.models.filter((model: any) => model.roles.includes('main'))
  assert.deepEqual(openaiOrdered.slice(0, 4).map((model: any) => [model.id, model.releasedAt]), [
    ['gpt-6-astra', '2026-09-03'],
    ['gpt-5.6-sol', '2026-07-09'],
    ['gpt-5.6-terra', '2026-07-09'],
    ['gpt-5.6-luna', '2026-07-09'],
  ])
  assert.equal(openaiOrdered[0].releaseOrder > openaiOrdered[1].releaseOrder, true)

  const ark = await legacy.default(context({ action: 'modelRegistry', provider: 'ark' }))
  assert.equal(ark.code, 0)
  assert.equal(ark.providers.ark.accessKind, 'aggregator')
  assert.equal(ark.providers.ark.routeContractVersion, 1)
  assert.equal(ark.providers.ark.accountCatalogRequired, true)
  assert.deepEqual(ark.providers.ark.defaults, {
    main: 'doubao-seed-2-1-pro-260628',
    image: 'doubao-seedream-5-0-pro-260628',
    vision: 'doubao-seed-2-1-pro-260628',
  })
  const arkModels = new Map<string, any>(ark.providers.ark.models.map((model: any) => [model.id, model]))
  assert.deepEqual(new Set(arkModels.keys()), new Set([
    'doubao-seed-2-1-pro-260628',
    'doubao-seed-2-1-turbo-260628',
    'doubao-seed-evolving',
    'doubao-seed-2-0-lite-260428',
    'doubao-seed-2-0-mini-260428',
    'doubao-seed-2-0-pro-260215',
    'doubao-seed-2-0-lite-260215',
    'doubao-seed-2-0-mini-260215',
    'doubao-seed-2-0-code-preview-260215',
    'glm-5-2-260617',
    'deepseek-v4-pro-ga-260813',
    'deepseek-v4-flash-ga-260731',
    'deepseek-v4-pro-260425',
    'deepseek-v4-flash-260425',
    'doubao-seedream-5-0-pro-260628',
    'doubao-seedream-5-0-260128',
    'doubao-seedream-4-5-251128',
    'doubao-seedream-4-0-250828',
    'doubao-seed-1-8-251228',
    'doubao-seed-code-preview-251028',
    'doubao-seed-1-6-flash-250828',
    'doubao-seed-1-6-vision-250815',
    'doubao-seed-1-6-250615',
    'doubao-seed-1-6-251015',
    'doubao-seed-1-6-flash-250615',
    'doubao-1-5-pro-32k-250115',
    'doubao-1-5-lite-32k-250115',
    'glm-4-7-251222',
    'doubao-1-5-vision-pro-32k-250115',
  ]))
  assert.deepEqual(arkModels.get('doubao-seed-2-1-pro-260628')?.roles, ['main', 'vision'])
  assert.equal(arkModels.get('doubao-seed-2-1-pro-260628')?.recommended, true)
  assert.equal(arkModels.get('doubao-seed-evolving')?.lifecycle, 'unknown')
  assert.equal(arkModels.get('doubao-seed-2-0-code-preview-260215')?.lifecycle, 'preview')
  assert.equal(arkModels.get('doubao-seed-character-260628'), undefined)
  assert.equal(arkModels.get('doubao-seed-translation-250915'), undefined)
  assert.deepEqual(arkModels.get('glm-5-2-260617')?.roles, ['main'])
  assert.deepEqual(arkModels.get('deepseek-v4-pro-ga-260813')?.roles, ['main'])
  assert.deepEqual(arkModels.get('doubao-seedream-5-0-pro-260628')?.capabilities.resolutions, ['1K', '2K'])
  assert.equal(arkModels.get('doubao-seedream-5-0-pro-260628')?.recommended, true)
  assert.deepEqual(arkModels.get('doubao-seedream-5-0-260128')?.capabilities.resolutions, ['2K', '4K'])
  assert.deepEqual(arkModels.get('doubao-seedream-4-5-251128')?.capabilities.outputFormats, ['png'])
  assert.deepEqual(arkModels.get('doubao-seedream-4-0-250828')?.roles, ['image'])
  assert.equal(arkModels.get('doubao-seedream-4-0-250828')?.capabilities.imageEditMode, 'direct-edit')
  assert.equal(arkModels.get('doubao-seedream-4-0-250828')?.capabilities.imageEditing, true)
  assert.deepEqual(arkModels.get('doubao-seedream-4-0-250828')?.capabilities.outputFormats, ['png'])
  for (const model of arkModels.values()) {
    assert.equal(model.verified, false)
    assert.ok(['unverified', 'catalog'].includes(model.verificationState))
    assert.equal(model.requiresEntitlement, true)
    assert.equal(model.releasedAt, null)
    assert.match(model.officialSourceUrl, /^https:\/\//)
  }
})

test('modelRegistry exposes adapter-truthful canonical refinement resolutions for every static image entry', async () => {
  const legacy = await loadLegacy()
  const context = (provider: string) => ({
    request: { method: 'POST' },
    body: { action: 'modelRegistry', provider },
    headers: {},
    response: { setHeader() {}, status() {} },
  })
  const expected = {
    gemini: {
      'gemini-3.1-flash-image': ['512', '1K', '2K', '4K'],
      'gemini-3.1-flash-lite-image': ['1K'],
      'gemini-3-pro-image': ['1K', '2K', '4K'],
      'gemini-2.5-flash-image': ['1K'],
    },
    bailian: {
      'wan2.7-image-pro': ['1K', '2K'],
      'wan2.7-image': ['1K', '2K'],
      'qwen-image-3.0': ['1K', '2K'],
      'qwen-image-3.0-pro': ['1K', '2K'],
      'qwen-image-2.0-pro': ['1K', '2K'],
      'qwen-image-2.0': ['1K', '2K'],
      'z-image-turbo': ['1K', '2K'],
    },
    openai: {
      'gpt-image-2': ['1K', '2K', '4K'],
      'gpt-image-1': ['1K'],
      'gpt-image-1-mini': ['1K'],
    },
    ark: {
      'doubao-seedream-5-0-pro-260628': ['1K', '2K'],
      'doubao-seedream-5-0-260128': ['2K', '4K'],
      'doubao-seedream-4-5-251128': ['2K', '4K'],
      'doubao-seedream-4-0-250828': ['1K', '2K', '4K'],
    },
  } as const

  for (const [provider, providerExpected] of Object.entries(expected)) {
    const result = await legacy.default(context(provider))
    assert.equal(result.code, 0, JSON.stringify(result))
    assert.equal(result.registryVersion, '2026-09-09.v16')
    const imageModels = result.providers[provider].models.filter((model: any) => model.roles.includes('image'))
    for (const [id, sizes] of Object.entries(providerExpected)) {
      assert.deepEqual(imageModels.find((model: any) => model.id === id)?.capabilities.refineResolutions, sizes, `${provider}/${id}`)
    }
    for (const model of imageModels) {
      assert.ok(Array.isArray(model.capabilities.refineResolutions), `${provider}/${model.id}`)
      assert.equal(
        model.capabilities.refineResolutions.every((value: string) => ['512', '1K', '2K', '4K', 'auto'].includes(value)),
        true,
        `${provider}/${model.id}`,
      )
    }
  }
})

test('Ark text, vision, and image generation use the exact CN data plane with bearer-only secrets', async () => {
  const legacy = await loadLegacy()
  const secret = 'ark-request-secret'
  const arkJpegBase64 = fs.readFileSync(path.resolve(packageRoot, '../web/public/logo.jpg')).toString('base64')
  const calls: Array<{ url: string; headers: Headers; body: any }> = []
  legacy.configureRuntimeFetch(async (input, init) => {
    const call = {
      url: String(input),
      headers: new Headers(init?.headers),
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    }
    calls.push(call)
    if (call.url.endsWith('/chat/completions')) {
      return Response.json({ choices: [{ message: { content: `ok-${calls.length}` } }] })
    }
    if (call.url.endsWith('/images/generations')) {
      return Response.json({ data: [{ b64_json: arkJpegBase64 }] })
    }
    throw new Error(`unexpected Ark request: ${call.url}`)
  })
  try {
    assert.equal(
      await legacy.callTextModel('ark', 'doubao-seed-2-0-mini-260428', secret, 'system', 'user'),
      'ok-1',
    )
    assert.equal(
      await legacy.callVisionModel('ark', 'doubao-seed-2-0-lite-260428', secret, 'method', 'caption', [{
        filename: 'probe.png', mimeType: 'image/png', url: 'data:image/png;base64,YQ==',
      }]),
      'ok-2',
    )
    const generated = await legacy.callImageModel('ark', 'doubao-seedream-4-0-250828', secret, 'diagram', '16:9', '', '2K')
    const edited = await legacy.callImageModel('ark', 'doubao-seedream-4-0-250828', secret, 'edit diagram', '16:9', 'data:image/png;base64,YQ==', '2K')
    assert.equal(Buffer.from(generated, 'base64').subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
    assert.equal(Buffer.from(edited, 'base64').subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
  } finally {
    legacy.configureRuntimeFetch()
  }

  assert.deepEqual(calls.map((call) => call.url), [
    'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    'https://ark.cn-beijing.volces.com/api/v3/images/generations',
    'https://ark.cn-beijing.volces.com/api/v3/images/generations',
  ])
  for (const call of calls) {
    assert.equal(call.headers.get('authorization'), `Bearer ${secret}`)
    assert.equal(call.headers.get('content-type'), 'application/json')
    assert.doesNotMatch(JSON.stringify(call.body), new RegExp(secret))
  }
  assert.equal(calls[0].body.model, 'doubao-seed-2-0-mini-260428')
  assert.equal(calls[1].body.model, 'doubao-seed-2-0-lite-260428')
  assert.deepEqual(calls[1].body.messages[1].content, [
    { type: 'text', text: calls[1].body.messages[1].content[0].text },
    { type: 'image_url', image_url: { url: 'data:image/png;base64,YQ==' } },
  ])
  assert.deepEqual(calls[2].body, {
    model: 'doubao-seedream-4-0-250828',
    prompt: 'diagram',
    size: '2720x1530',
    sequential_image_generation: 'disabled',
    stream: false,
    response_format: 'b64_json',
  })
  assert.deepEqual(calls[3].body, {
    model: 'doubao-seedream-4-0-250828',
    prompt: 'edit diagram',
    image: ['data:image/png;base64,YQ=='],
    size: '2720x1530',
    sequential_image_generation: 'disabled',
    stream: false,
    response_format: 'b64_json',
  })
})

test('Ark current models disable default thinking and use model-specific Seedream request contracts', async () => {
  const legacy = await loadLegacy()
  const arkJpegBase64 = fs.readFileSync(path.resolve(packageRoot, '../web/public/logo.jpg')).toString('base64')
  const calls: Array<{ url: string; body: any }> = []
  legacy.configureRuntimeFetch(async (input, init) => {
    const call = { url: String(input), body: init?.body ? JSON.parse(String(init.body)) : undefined }
    calls.push(call)
    if (call.url.endsWith('/chat/completions')) {
      return Response.json({ choices: [{ message: { content: 'ok' } }] })
    }
    return Response.json({ data: [{ b64_json: arkJpegBase64 }] })
  })
  try {
    await assert.rejects(
      legacy.callImageModel('ark', 'doubao-seedream-5-0-pro-260628', 'key', 'invalid pro size', '16:9', '', '4K'),
      /does not support 4K/,
    )
    assert.equal(calls.length, 0, 'unsupported Ark sizes must fail before dispatch')
    await legacy.callTextModel('ark', 'doubao-seed-2-1-pro-260628', 'key', 'system', 'user')
    await legacy.callImageModel('ark', 'doubao-seedream-5-0-pro-260628', 'key', 'pro image', '16:9', '', '1K')
    await legacy.callImageModel('ark', 'doubao-seedream-5-0-lite-260128', 'key', 'canonical alias', 'auto', '', '4K')
    await legacy.callImageModel('ark', 'doubao-seedream-4-5-251128', 'key', '4.5 image', 'auto', '', '2K')
  } finally {
    legacy.configureRuntimeFetch()
  }

  assert.deepEqual(calls[0].body.thinking, { type: 'disabled' })
  assert.deepEqual(calls[1].body, {
    model: 'doubao-seedream-5-0-pro-260628',
    prompt: 'pro image',
    size: '1360x765',
    response_format: 'b64_json',
  })
  assert.deepEqual(calls[2].body, {
    model: 'doubao-seedream-5-0-260128',
    prompt: 'canonical alias',
    size: '4K',
    sequential_image_generation: 'disabled',
    stream: false,
    response_format: 'b64_json',
  })
  assert.deepEqual(calls[3].body, {
    model: 'doubao-seedream-4-5-251128',
    prompt: '4.5 image',
    size: '2K',
    sequential_image_generation: 'disabled',
    stream: false,
    response_format: 'b64_json',
  })
  assert.equal(legacy.normalizeModelName('ark', 'doubao-seedream-5-0-lite-260128'), 'doubao-seedream-5-0-260128')
})

test('modelCapability accepts Ark while unknown IDs and wrong route roles remain fail-closed', async () => {
  const legacy = await loadLegacy()
  const context = (body: Record<string, unknown>) => ({
    request: { method: 'POST' }, body, headers: {}, response: { setHeader() {}, status() {} },
  })
  const capability = await legacy.default(context({
    action: 'modelCapability', provider: 'ark', model: 'doubao-seedream-4-0-250828',
  }))
  assert.equal(capability.code, 0)
  assert.equal(capability.status, 'supported')
  assert.equal(capability.refineMode, 'direct-edit')

  const state = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  const insertCount = state.inserts.length
  const base = {
    action: 'createJob', provider: 'ark', configurationMode: 'advanced', apiKeys: { ark: 'key' },
    methodContent: 'A sufficiently detailed method for fail-closed Ark registry validation.',
    caption: 'Ark registry validation.', outputFormat: 'png', pipelineMode: 'vanilla', retrievalSetting: 'none',
    modelRoutes: {
      main: { accessProvider: 'ark', modelId: 'doubao-seed-2-0-mini-260428' },
      image: { accessProvider: 'ark', modelId: 'unknown-seedream' },
      vision: { accessProvider: 'ark', modelId: 'doubao-seed-2-0-lite-260428' },
    },
  }
  const unknown = await legacy.default(context(base))
  assert.equal(unknown.code, 400)
  assert.match(unknown.error, /not registered for image/)
  const wrongRole = await legacy.default(context({
    ...base,
    modelRoutes: { ...base.modelRoutes, image: { accessProvider: 'ark', modelId: 'doubao-seed-2-0-mini-260428' } },
  }))
  assert.equal(wrongRole.code, 400)
  assert.match(wrongRole.error, /not registered for image/)
  assert.equal(state.inserts.length, insertCount)
})

test('Ark image generation rejects URL-only output, invalid base64, and oversized responses without CDN fetches', async () => {
  const legacy = await loadLegacy()
  let calls = 0
  const oversizedJpegHeader = Buffer.from([
    0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x20, 0x01, 0x20, 0x01,
    0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x00, 0x03, 0x11, 0x00,
  ]).toString('base64')
  legacy.configureRuntimeFetch(async () => {
    calls += 1
    if (calls === 1) return Response.json({ data: [{ url: 'https://cdn.invalid/ark.png' }] })
    if (calls === 2) return Response.json({ data: [{ b64_json: 'not-base64!' }] })
    if (calls === 3) return Response.json({ data: [{ b64_json: 'a' }] })
    if (calls === 4) return Response.json({ data: [{ b64_json: 'YQ=' }] })
    if (calls === 5) return Response.json({ data: [{ b64_json: '/9j/' }] })
    if (calls === 6) return Response.json({ data: [{ b64_json: oversizedJpegHeader }] })
    return new Response('', { headers: { 'Content-Length': String(30 * 1024 * 1024) } })
  })
  try {
    await assert.rejects(
      legacy.callImageModel('ark', 'doubao-seedream-4-0-250828', 'key', 'diagram', '16:9'),
      /did not return image data/,
    )
    assert.equal(calls, 1, 'URL-only results must not trigger a CDN fetch')
    await assert.rejects(
      legacy.callImageModel('ark', 'doubao-seedream-4-0-250828', 'key', 'diagram', '16:9'),
      /invalid base64 data/,
    )
    await assert.rejects(
      legacy.callImageModel('ark', 'doubao-seedream-4-0-250828', 'key', 'diagram', '16:9'),
      /invalid base64 data/,
    )
    await assert.rejects(
      legacy.callImageModel('ark', 'doubao-seedream-4-0-250828', 'key', 'diagram', '16:9'),
      /invalid base64 data/,
    )
    await assert.rejects(
      legacy.callImageModel('ark', 'doubao-seedream-4-0-250828', 'key', 'diagram', '16:9'),
      /invalid or oversized JPEG dimensions/,
    )
    await assert.rejects(
      legacy.callImageModel('ark', 'doubao-seedream-4-0-250828', 'key', 'diagram', '16:9'),
      /invalid or oversized JPEG dimensions/,
    )
    await assert.rejects(
      legacy.callImageModel('ark', 'doubao-seedream-4-0-250828', 'key', 'diagram', '16:9'),
      /Ark image response exceeds/,
    )
  } finally {
    legacy.configureRuntimeFetch()
  }
})

test('a registry model without direct edit fails before downloading its remote source', async () => {
  const legacy = await loadLegacy()
  let calls = 0
  legacy.configureRuntimeFetch(async () => {
    calls += 1
    return new Response('source')
  })
  try {
    await assert.rejects(
      legacy.callImageModel('bailian', 'z-image-turbo', 'key', 'edit', '16:9', 'https://source.invalid/image.png'),
      /does not accept a source image; direct edit is unavailable/,
    )
    assert.equal(calls, 0)
  } finally {
    legacy.configureRuntimeFetch()
  }
})

test('Ark adapters propagate the injected production egress fail-closed signal without exposing a key', async () => {
  const legacy = await loadLegacy()
  const secret = 'ark-egress-secret'
  let requestedUrl = ''
  legacy.configureRuntimeFetch(async (input) => {
    requestedUrl = String(input)
    const error: any = new Error('海外模型出口暂不可用，请稍后重试。')
    error.code = 'PROVIDER_EGRESS_UNAVAILABLE'
    throw error
  })
  try {
    await assert.rejects(
      legacy.callTextModel('ark', 'doubao-seed-2-0-mini-260428', secret, 'system', 'user'),
      (error: any) => {
        assert.equal(error.code, 'PROVIDER_EGRESS_UNAVAILABLE')
        assert.equal(error.message, '海外模型出口暂不可用，请稍后重试。')
        assert.doesNotMatch(error.message, new RegExp(secret))
        return true
      },
    )
    assert.equal(requestedUrl, 'https://ark.cn-beijing.volces.com/api/v3/chat/completions')
  } finally {
    legacy.configureRuntimeFetch()
  }
})

test('providerAccountCatalog truthfully uses only bounded Ark inference smoke probes', async () => {
  const legacy = await loadLegacy()
  const gateway = installProviderAccountTestGateway()
  const secret = 'ark-account-secret'
  const calls: Array<{ url: string; body: any; authorization: string }> = []
  legacy.configureRuntimeFetch(async (input, init) => {
    const url = String(input)
    const body = init?.body ? JSON.parse(String(init.body)) : undefined
    calls.push({ url, body, authorization: new Headers(init?.headers).get('authorization') || '' })
    if (url.endsWith('/chat/completions')) return Response.json({ choices: [{ message: { content: 'OK' } }] })
    if (url.endsWith('/images/generations')) return Response.json({ data: [{ b64_json: onePixelPngBase64 }] })
    throw new Error(`unexpected account probe: ${url}`)
  })
  const invoke = (body: Record<string, unknown>) => legacy.default({
    request: { method: 'POST' }, body: { ...body, gatewayToken: gateway.token }, headers: {}, response: { setHeader() {}, status() {} },
  })
  try {
    const unconfirmed = await invoke({
      action: 'providerAccountCatalog', provider: 'ark', apiKeys: { ark: secret },
      probes: [
        { role: 'main', modelId: 'doubao-seed-2-0-mini-260428' },
        { role: 'main', modelId: 'doubao-seed-2-0-mini-260428' },
        { role: 'image', modelId: 'doubao-seedream-4-0-250828' },
      ],
    })
    assert.equal(unconfirmed.code, 0, JSON.stringify(unconfirmed))
    assert.equal(unconfirmed.provider, 'ark')
    assert.equal(unconfirmed.accountCatalogAvailable, false)
    assert.equal(unconfirmed.catalogAuth, 'access-key-required')
    assert.equal(unconfirmed.verificationMode, 'inference-smoke')
    assert.equal(unconfirmed.providerRegistry.accessKind, 'aggregator')
    assert.equal(unconfirmed.providerRegistry.accountCatalogRequired, true)
    assert.deepEqual(unconfirmed.probeResults.map((result: any) => ({
      role: result.role,
      modelId: result.modelId,
      state: result.state,
      accountAvailable: result.accountAvailable,
      verifiedBy: result.verifiedBy,
    })), [
      {
        role: 'main', modelId: 'doubao-seed-2-0-mini-260428', state: 'verified',
        accountAvailable: true, verifiedBy: 'inference-smoke',
      },
      {
        role: 'image', modelId: 'doubao-seedream-4-0-250828', state: 'paid-probe-required',
        accountAvailable: false, verifiedBy: undefined,
      },
    ])
    assert.equal(calls.length, 1, 'duplicate and unconfirmed paid probes must not make calls')
    assert.equal(calls[0].url, 'https://ark.cn-beijing.volces.com/api/v3/chat/completions')
    assert.equal(calls[0].body.max_tokens, 8)
    assert.deepEqual(calls[0].body.thinking, { type: 'disabled' })

    const confirmed = await invoke({
      action: 'providerAccountCatalog', provider: 'ark', apiKeys: { ark: secret }, confirmPaidImageProbe: true,
      probes: [
        { role: 'vision', modelId: 'doubao-seed-2-0-lite-260428' },
        { role: 'image', modelId: 'doubao-seedream-5-0-260128' },
      ],
    })
    assert.deepEqual(confirmed.probeResults.map((result: any) => [result.role, result.state, result.verifiedBy]), [
      ['vision', 'verified', 'inference-smoke'],
      ['image', 'verified', 'inference-smoke'],
    ])
    assert.equal(calls.length, 3)
    assert.deepEqual(calls.slice(1).map((call) => call.url), [
      'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
      'https://ark.cn-beijing.volces.com/api/v3/images/generations',
    ])
    assert.match(JSON.stringify(calls[1].body), /data:image\/png;base64/)
    const visionProbeImageUrl = calls[1].body.messages[0].content
      .find((part: any) => part.type === 'image_url')?.image_url?.url
    const visionProbeImage = Buffer.from(String(visionProbeImageUrl).split(',', 2)[1] || '', 'base64')
    assert.equal(visionProbeImage.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
    assert.ok(visionProbeImage.readUInt32BE(16) >= 14, 'Ark vision probe must meet the provider minimum width')
    assert.ok(visionProbeImage.readUInt32BE(20) >= 14, 'Ark vision probe must meet the provider minimum height')
    assert.equal(calls[1].body.max_tokens, 8)
    assert.equal(calls[2].body.response_format, 'b64_json')
    assert.equal(calls[2].body.size, '2K')
    assert.equal(calls[2].body.sequential_image_generation, 'disabled')
    assert.equal(calls[2].body.stream, false)
    assert.equal(calls.some((call) => /ListModelActivations|openapi\.volcengine/i.test(call.url)), false)
    for (const call of calls) assert.equal(call.authorization, `Bearer ${secret}`)
    assert.doesNotMatch(JSON.stringify(unconfirmed) + JSON.stringify(confirmed), new RegExp(secret))
  } finally {
    legacy.configureRuntimeFetch()
    gateway.restore()
  }
})

test('providerAccountCatalog bounds probes and reports unknown, wrong-role, missing-key, and redacted failures', async () => {
  const legacy = await loadLegacy()
  const gateway = installProviderAccountTestGateway()
  const invoke = (body: Record<string, unknown>) => legacy.default({
    request: { method: 'POST' }, body: { ...body, gatewayToken: gateway.token }, headers: {}, response: { setHeader() {}, status() {} },
  })
  let calls = 0
  legacy.configureRuntimeFetch(async () => {
    calls += 1
    return Response.json({ error: { message: 'denied ark-redaction-secret' } }, { status: 403 })
  })
  try {
    const tooMany = await invoke({
      action: 'providerAccountCatalog', provider: 'ark', apiKeys: { ark: 'key' },
      probes: [
        { role: 'main', modelId: 'doubao-seed-2-0-mini-260428' },
        { role: 'vision', modelId: 'doubao-seed-2-0-mini-260428' },
        { role: 'image', modelId: 'doubao-seedream-4-0-250828' },
        { role: 'main', modelId: 'doubao-seed-2-0-lite-260428' },
      ],
    })
    assert.equal(tooMany.code, 400)
    assert.match(tooMany.error, /at most 3 probes/)

    const invalid = await invoke({
      action: 'providerAccountCatalog', provider: 'ark', apiKeys: {},
      probes: [
        { role: 'main', modelId: 'unknown-ark-model' },
        { role: 'main', modelId: 'doubao-seedream-4-0-250828' },
        { role: 'vision', modelId: 'doubao-seed-2-0-mini-260428' },
      ],
    })
    assert.deepEqual(invalid.probeResults.map((result: any) => [result.state, result.accountAvailable]), [
      ['unknown-model', false],
      ['wrong-role', false],
      ['missing-key', false],
    ])
    assert.equal(calls, 0)

    const failed = await invoke({
      action: 'providerAccountCatalog', provider: 'ark', apiKeys: { ark: 'ark-redaction-secret' },
      probes: [{ role: 'main', modelId: 'doubao-seed-2-0-mini-260428' }],
    })
    assert.equal(failed.probeResults[0].state, 'failed')
    assert.equal(failed.probeResults[0].accountAvailable, false)
    assert.equal(failed.probeResults[0].reason, 'Ark inference probe failed')
    assert.doesNotMatch(JSON.stringify(failed), /ark-redaction-secret|denied/)
    assert.equal(calls, 1)
  } finally {
    legacy.configureRuntimeFetch()
    gateway.restore()
  }
})

test('providerAccountCatalog never verifies empty or malformed successful Ark chat responses', async () => {
  const legacy = await loadLegacy()
  const gateway = installProviderAccountTestGateway()
  let calls = 0
  legacy.configureRuntimeFetch(async () => {
    calls += 1
    if (calls === 1) return Response.json({})
    if (calls === 2) return Response.json({ choices: [{ message: { content: '' } }] })
    return Response.json({ choices: [{ message: { content: 'x'.repeat(70 * 1024) } }] })
  })
  try {
    const result = await legacy.default({
      request: { method: 'POST' },
      body: {
        action: 'providerAccountCatalog', provider: 'ark', apiKeys: { ark: 'key' },
        gatewayToken: gateway.token,
        probes: [
          { role: 'main', modelId: 'doubao-seed-2-0-mini-260428' },
          { role: 'vision', modelId: 'doubao-seed-2-0-lite-260428' },
          { role: 'main', modelId: 'doubao-seed-2-0-lite-260428' },
        ],
      },
      headers: {}, response: { setHeader() {}, status() {} },
    })
    assert.deepEqual(result.probeResults.map((probe: any) => [probe.role, probe.state, probe.accountAvailable]), [
      ['main', 'failed', false],
      ['vision', 'failed', false],
      ['main', 'failed', false],
    ])
    assert.equal(calls, 3)
  } finally {
    legacy.configureRuntimeFetch()
    gateway.restore()
  }
})

test('providerAccountCatalog performs exactly one bounded dispatch per logical probe', async () => {
  const legacy = await loadLegacy()
  const gateway = installProviderAccountTestGateway()
  let calls = 0
  legacy.configureRuntimeFetch(async () => {
    calls += 1
    throw new Error('network unavailable')
  })
  try {
    const result = await legacy.default({
      request: { method: 'POST' },
      body: {
        action: 'providerAccountCatalog', provider: 'ark', apiKeys: { ark: 'key' }, confirmPaidImageProbe: true,
        gatewayToken: gateway.token,
        probes: [
          { role: 'main', modelId: 'doubao-seed-2-0-mini-260428' },
          { role: 'vision', modelId: 'doubao-seed-2-0-lite-260428' },
          { role: 'image', modelId: 'doubao-seedream-4-0-250828' },
        ],
      },
      headers: {}, response: { setHeader() {}, status() {} },
    })
    assert.deepEqual(result.probeResults.map((probe: any) => probe.state), ['failed', 'failed', 'failed'])
    assert.equal(calls, 3, 'one logical probe must never retry or duplicate a paid image request')
  } finally {
    legacy.configureRuntimeFetch()
    gateway.restore()
  }
})

test('providerAccountCatalog requires the configured trusted caller boundary', async () => {
  const legacy = await loadLegacy()
  const previous = process.env.PAPERBANANA_GATEWAY_TOKEN
  process.env.PAPERBANANA_GATEWAY_TOKEN = 'catalog-gateway-token'
  const invoke = (body: Record<string, unknown>) => legacy.default({
    request: { method: 'POST' }, body, headers: {}, response: { setHeader() {}, status() {} },
  })
  try {
    const denied = await invoke({ action: 'providerAccountCatalog', provider: 'ark', apiKeys: { ark: 'key' } })
    assert.equal(denied.code, 401)
    const allowed = await invoke({
      action: 'providerAccountCatalog', provider: 'ark', apiKeys: { ark: 'key' }, gatewayToken: 'catalog-gateway-token',
    })
    assert.equal(allowed.code, 0)
    assert.equal(allowed.accountCatalogAvailable, false)
  } finally {
    if (previous === undefined) delete process.env.PAPERBANANA_GATEWAY_TOKEN
    else process.env.PAPERBANANA_GATEWAY_TOKEN = previous
  }
})

test('providerAccountCatalog bounds concurrent probes by principal and client IP', async () => {
  const legacy = await loadLegacy()
  const gateway = installProviderAccountTestGateway()
  let calls = 0
  let releaseFirst!: () => void
  let markStarted!: () => void
  const firstBlocked = new Promise<void>((resolve) => { releaseFirst = resolve })
  const firstStarted = new Promise<void>((resolve) => { markStarted = resolve })
  legacy.configureRuntimeFetch(async () => {
    calls += 1
    if (calls === 1) {
      markStarted()
      await firstBlocked
    }
    return Response.json({ choices: [{ message: { content: 'OK' } }] })
  })
  const invoke = (userId: string, ip: string) => legacy.default({
    request: { method: 'POST' },
    body: {
      action: 'providerAccountCatalog', provider: 'ark', apiKeys: { ark: 'key' },
      gatewayToken: gateway.token, userId,
      probes: [{ role: 'main', modelId: 'doubao-seed-2-0-mini-260428' }],
    },
    headers: { 'x-forwarded-for': ip }, response: { setHeader() {}, status() {} },
  })
  try {
    const first = invoke('owner-a', '203.0.113.10')
    await firstStarted
    const sameOwner = await invoke('owner-a', '203.0.113.11')
    const sameIp = await invoke('owner-b', '203.0.113.10')
    assert.equal(sameOwner.code, 429)
    assert.equal(sameIp.code, 429)
    assert.equal(calls, 1)
    releaseFirst()
    assert.equal((await first).probeResults[0].state, 'verified')
  } finally {
    releaseFirst()
    legacy.configureRuntimeFetch()
    gateway.restore()
  }
})

test('providerAccountCatalog aborts a hung Ark probe by deadline and immediately releases principal capacity', async () => {
  const legacy = await loadLegacy()
  const gateway = installProviderAccountTestGateway()
  const previousTimeout = process.env.PAPERBANANA_PROVIDER_ACCOUNT_PROBE_TIMEOUT_MS
  const secret = 'ark-hung-probe-secret'
  const observedSignals: AbortSignal[] = []
  let hungCalls = 0
  process.env.PAPERBANANA_PROVIDER_ACCOUNT_PROBE_TIMEOUT_MS = '100'
  legacy.configureRuntimeFetch(async (_input, init) => {
    hungCalls += 1
    if (init?.signal) observedSignals.push(init.signal as AbortSignal)
    return await new Promise<Response>(() => {})
  })
  const invoke = (probes = [{ role: 'main', modelId: 'doubao-seed-2-0-mini-260428' }]) => legacy.default({
    request: { method: 'POST' },
    body: {
      action: 'providerAccountCatalog', provider: 'ark', apiKeys: { ark: secret }, gatewayToken: gateway.token,
      userId: 'hung-owner', probes,
    },
    headers: { 'x-forwarded-for': '203.0.113.55' }, response: { setHeader() {}, status() {} },
  })
  try {
    const first = await Promise.race([
      invoke([
        { role: 'main', modelId: 'doubao-seed-2-0-mini-260428' },
        { role: 'vision', modelId: 'doubao-seed-2-0-lite-260428' },
        { role: 'main', modelId: 'doubao-seed-2-0-lite-260428' },
      ]),
      new Promise((resolve) => setTimeout(() => resolve({ testTimeout: true }), 750)),
    ]) as any
    assert.equal(first.testTimeout, undefined, 'the provider-account deadline must settle a fetch that ignores abort')
    assert.equal(first.code, 0)
    assert.deepEqual(first.probeResults.map((probe: any) => probe.state), ['failed', 'failed', 'failed'])
    assert.doesNotMatch(JSON.stringify(first), /ark-hung-probe-secret|timed out|abort/i)
    assert.equal(hungCalls, 1, 'one end-to-end deadline must prevent dispatching later probes after abort')
    assert.equal(observedSignals[0]?.aborted, true)

    legacy.configureRuntimeFetch(async () => Response.json({ choices: [{ message: { content: 'OK' } }] }))
    const recovered = await invoke()
    assert.equal(recovered.code, 0)
    assert.equal(recovered.probeResults[0].state, 'verified')
  } finally {
    legacy.configureRuntimeFetch()
    gateway.restore()
    if (previousTimeout === undefined) delete process.env.PAPERBANANA_PROVIDER_ACCOUNT_PROBE_TIMEOUT_MS
    else process.env.PAPERBANANA_PROVIDER_ACCOUNT_PROBE_TIMEOUT_MS = previousTimeout
  }
})

test('admin evaluation routes Ark overrides exactly and rejects unknown providers', async () => {
  const legacy = await loadLegacy()
  const state = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  const previousRows = state.jobRows
  const previousAdminToken = process.env.ADMIN_TOKEN
  state.jobRows = [{
    _id: 'evaluate-ark-job',
    provider: 'openai',
    mainModelName: 'gpt-5.6-sol',
    methodContent: 'A sufficiently detailed method for evaluating a generated academic diagram.',
    caption: 'Figure 1: Evaluation target.',
    resultImages: [{ url: 'data:image/png;base64,YQ==' }],
    referenceImages: [],
  }]
  process.env.ADMIN_TOKEN = 'evaluate-admin-token'
  const calls: Array<{ url: string; authorization: string; model: string }> = []
  legacy.configureRuntimeFetch(async (input, init) => {
    const body = JSON.parse(String(init?.body || '{}'))
    calls.push({
      url: String(input),
      authorization: new Headers(init?.headers).get('authorization') || '',
      model: body.model || '',
    })
    return Response.json({ choices: [{ message: { content: '{"score":8,"reasoning":"clear"}' } }] })
  })
  const invoke = (body: Record<string, unknown>) => legacy.default({
    request: { method: 'POST' }, body, headers: {}, response: { setHeader() {}, status() {} },
  })
  try {
    const evaluated = await invoke({
      action: 'evaluateJob', adminToken: 'evaluate-admin-token', jobId: 'evaluate-ark-job',
      provider: 'ark', model: 'doubao-seed-2-0-mini-260428', apiKey: 'ark-evaluate-secret',
    })
    assert.equal(evaluated.code, 0, JSON.stringify(evaluated))
    assert.equal(calls.length, 4)
    assert.equal(calls.every((call) => call.url === 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'), true)
    assert.equal(calls.every((call) => call.authorization === 'Bearer ark-evaluate-secret'), true)
    assert.equal(calls.every((call) => call.model === 'doubao-seed-2-0-mini-260428'), true)

    const beforeInvalid = calls.length
    const invalid = await invoke({
      action: 'evaluateJob', adminToken: 'evaluate-admin-token', jobId: 'evaluate-ark-job',
      provider: 'unknown-provider', model: 'do-not-route', apiKey: 'do-not-send',
    })
    assert.equal(invalid.code, 400)
    assert.match(invalid.error, /Invalid judge provider/)
    assert.equal(calls.length, beforeInvalid)
  } finally {
    legacy.configureRuntimeFetch()
    state.jobRows = previousRows
    if (previousAdminToken === undefined) delete process.env.ADMIN_TOKEN
    else process.env.ADMIN_TOKEN = previousAdminToken
  }
})

test('legacy client defaults map explicitly to current registered model IDs', async () => {
  const legacy = await loadLegacy()
  assert.equal(legacy.normalizeModelName('gemini', 'gemini-3.1-pro'), 'gemini-3.1-pro-preview')
  assert.equal(legacy.normalizeModelName('gemini', 'gemini-3-flash'), 'gemini-3-flash-preview')
  assert.equal(legacy.normalizeModelName('openai', 'gpt-5.5-pro'), 'gpt-5.5-pro')
  assert.equal(legacy.normalizeModelName('openai', 'gpt-5.4-pro'), 'gpt-5.4-pro')
  assert.equal(legacy.normalizeModelName('openai', 'gpt-image-1.5'), 'gpt-image-1.5')
  assert.equal(legacy.normalizeModelName('bailian', 'qwen3.7-max'), 'qwen3.7-max')
  assert.equal(legacy.normalizeModelName('bailian', 'qwen-image-2.0-pro'), 'qwen-image-2.0-pro')
  assert.equal(legacy.normalizeModelName('bailian', 'kimi-k2.6'), 'kimi-k2.6')
  assert.equal(legacy.normalizeModelName('bailian', 'MiniMax-M2.7'), 'MiniMax/MiniMax-M2.7')
  assert.equal(
    legacy.normalizeModelName('openrouter', 'openrouter/google/gemini-3.1-flash-image-preview'),
    'openrouter/google/gemini-3.1-flash-image-preview',
  )
  assert.equal(
    legacy.normalizeModelName('openrouter', 'openrouter/openai/gpt-5-image'),
    'openrouter/openai/gpt-5-image',
  )
})

test('Gemini 3 text and vision use generateContent while current image models use Interactions', async () => {
  const legacy = await loadLegacy()
  const requests: Array<{ url: string; body: any }> = []
  legacy.configureRuntimeFetch(async (input, init) => {
    requests.push({ url: String(input), body: JSON.parse(String(init?.body || '{}')) })
    const isImage = String(input).endsWith('/v1beta/interactions')
    return new Response(JSON.stringify(isImage
      ? { output_image: { data: 'aW1hZ2U=', mime_type: 'image/png' } }
      : { candidates: [{ content: { parts: [{ text: 'ok' }] } }] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  })
  try {
    assert.equal(await legacy.callTextModel('gemini', 'gemini-3.6-flash', 'key', 'system', 'user'), 'ok')
    assert.equal(await legacy.callVisionModel('gemini', 'gemini-3.6-flash', 'key', 'method', 'caption', [{
      url: 'data:image/png;base64,YQ==',
      mimeType: 'image/png',
    }]), 'ok')
    assert.equal(await legacy.callImageModel('gemini', 'gemini-3.1-flash-image', 'key', 'diagram', '16:9', 'data:image/png;base64,YQ==', '4K'), 'aW1hZ2U=')
  } finally {
    legacy.configureRuntimeFetch()
  }

  const generationRequests = requests.filter((request) => request.url.includes(':generateContent'))
  assert.equal(generationRequests.length, 2)
  for (const request of generationRequests) {
    assert.match(request.url, /models\/gemini-3\.6-flash:generateContent/)
    const serialized = JSON.stringify(request.body)
    assert.doesNotMatch(serialized, /temperature|topP|topK|top_p|top_k/)
  }
  const interaction = requests.find((request) => request.url.endsWith('/v1beta/interactions'))
  assert.equal(interaction?.body.model, 'gemini-3.1-flash-image')
  assert.deepEqual(interaction?.body.input, [
    { type: 'text', text: 'diagram' },
    { type: 'image', mime_type: 'image/png', data: 'YQ==' },
  ])
  assert.deepEqual(interaction?.body.response_format, {
    type: 'image', mime_type: 'image/png', aspect_ratio: '16:9', image_size: '4K',
  })
  assert.doesNotMatch(JSON.stringify(interaction?.body), /temperature|topP|topK|top_p|top_k/)
})

test('Gemini Interactions reads the official REST model_output image content before SDK conveniences', async () => {
  const legacy = await loadLegacy()
  legacy.configureRuntimeFetch(async (input) => {
    assert.match(String(input), /\/v1beta\/interactions$/)
    return Response.json({
      object: 'interaction',
      status: 'completed',
      steps: [{
        type: 'model_output',
        content: [
          { type: 'text', text: 'Generated image follows.' },
          { type: 'image', data: 'b2ZmaWNpYWw=', mime_type: 'image/png' },
        ],
      }],
      output_image: { data: 'ZmFsbGJhY2s=', mime_type: 'image/png' },
    })
  })
  try {
    assert.equal(
      await legacy.callImageModel('gemini', 'gemini-3.1-flash-image', 'key', 'diagram', '16:9'),
      'b2ZmaWNpYWw=',
    )
  } finally {
    legacy.configureRuntimeFetch()
  }
})

test('Gemini Interactions accepts an official image URI and keeps its download byte-bounded', async () => {
  const legacy = await loadLegacy()
  const calls: string[] = []
  legacy.configureRuntimeFetch(async (input) => {
    const url = String(input)
    calls.push(url)
    if (url.endsWith('/v1beta/interactions')) {
      return Response.json({
        steps: [{ type: 'model_output', content: [{ type: 'image', uri: 'https://images.invalid/generated.png', mime_type: 'image/png' }] }],
      })
    }
    if (url === 'https://images.invalid/generated.png') return new Response('remote-image')
    throw new Error(`unexpected request: ${url}`)
  })
  try {
    assert.equal(
      await legacy.callImageModel('gemini', 'gemini-3.1-flash-image', 'key', 'diagram', '16:9'),
      Buffer.from('remote-image').toString('base64'),
    )
  } finally {
    legacy.configureRuntimeFetch()
  }
  assert.deepEqual(calls, [
    'https://generativelanguage.googleapis.com/v1beta/interactions',
    'https://images.invalid/generated.png',
  ])
})

test('Gemini Interactions normalizes URL objects and SDK string fallbacks without bypassing remote size guards', async () => {
  const legacy = await loadLegacy()
  const interactions = [
    { steps: [{ type: 'model_output', content: [{ type: 'image', data: { url: 'https://images.invalid/nested-data.png' }, mime_type: 'image/png' }] }] },
    { steps: [{ type: 'model_output', content: [{ type: 'image', url: { url: 'https://images.invalid/nested-url.png' }, mime_type: 'image/png' }] }] },
    { output_image: 'c2RrLXN0cmluZw==' },
    { outputImage: 'https://images.invalid/oversized.png' },
  ]
  let interactionIndex = 0
  legacy.configureRuntimeFetch(async (input) => {
    const url = String(input)
    if (url.endsWith('/v1beta/interactions')) return Response.json(interactions[interactionIndex++])
    if (url === 'https://images.invalid/nested-data.png') return new Response('nested-data')
    if (url === 'https://images.invalid/nested-url.png') return new Response('nested-url')
    if (url === 'https://images.invalid/oversized.png') {
      return new Response('', { headers: { 'Content-Length': String(20 * 1024 * 1024 + 1) } })
    }
    throw new Error(`unexpected request: ${url}`)
  })
  try {
    assert.equal(
      await legacy.callImageModel('gemini', 'gemini-3.1-flash-image', 'key', 'diagram', '16:9'),
      Buffer.from('nested-data').toString('base64'),
    )
    assert.equal(
      await legacy.callImageModel('gemini', 'gemini-3.1-flash-image', 'key', 'diagram', '16:9'),
      Buffer.from('nested-url').toString('base64'),
    )
    assert.equal(
      await legacy.callImageModel('gemini', 'gemini-3.1-flash-image', 'key', 'diagram', '16:9'),
      'c2RrLXN0cmluZw==',
    )
    await assert.rejects(
      legacy.callImageModel('gemini', 'gemini-3.1-flash-image', 'key', 'diagram', '16:9'),
      /exceeds 20971520 byte limit/,
    )
  } finally {
    legacy.configureRuntimeFetch()
  }
})

test('Gemini Interactions official image content rejects missing, invalid, and oversized bytes', async () => {
  const legacy = await loadLegacy()
  const responses = [
    { steps: [{ type: 'model_output', content: [{ type: 'image', mime_type: 'image/png' }] }] },
    { steps: [{ type: 'model_output', content: [{ type: 'image', data: 'not-base64!', mime_type: 'image/png' }] }] },
    { steps: [{ type: 'model_output', content: [{ type: 'image', data: Buffer.alloc(20 * 1024 * 1024 + 1).toString('base64'), mime_type: 'image/png' }] }] },
  ]
  const expected = [/did not return image data/, /invalid base64 data/, /exceeds 20971520 byte limit/]
  for (let index = 0; index < responses.length; index += 1) {
    legacy.configureRuntimeFetch(async () => Response.json(responses[index]))
    await assert.rejects(
      legacy.callImageModel('gemini', 'gemini-3.1-flash-image', 'key', 'diagram', '16:9'),
      expected[index],
    )
  }
  legacy.configureRuntimeFetch()
})

test('Gemini 2.5 image generation retains generateContent compatibility at 1K', async () => {
  const legacy = await loadLegacy()
  const requests: Array<{ url: string; body: any }> = []
  legacy.configureRuntimeFetch(async (input, init) => {
    requests.push({ url: String(input), body: JSON.parse(String(init?.body || '{}')) })
    return Response.json({ candidates: [{ content: { parts: [{ inlineData: { data: 'bGVnYWN5' } }] } }] })
  })
  try {
    assert.equal(await legacy.callImageModel('gemini', 'gemini-2.5-flash-image', 'key', 'diagram', '16:9', '', '4K'), 'bGVnYWN5')
  } finally {
    legacy.configureRuntimeFetch()
  }
  assert.match(requests[0].url, /models\/gemini-2\.5-flash-image:generateContent/)
  assert.equal(requests[0].body.generationConfig.imageConfig.imageSize, '1K')
})

test('OpenAI Responses-only Pro models use /responses for text and vision', async () => {
  const legacy = await loadLegacy()
  const calls: Array<{ url: string; body: any }> = []
  legacy.configureRuntimeFetch(async (input, init) => {
    calls.push({ url: String(input), body: JSON.parse(String(init?.body || '{}')) })
    return Response.json({ output: [{ type: 'message', content: [{ type: 'output_text', text: 'response-ok' }] }] })
  })
  try {
    assert.equal(await legacy.callTextModel('openai', 'gpt-5.5-pro', 'key', 'system', 'user'), 'response-ok')
    assert.equal(await legacy.callVisionModel('openai', 'gpt-5.4-pro', 'key', 'method', 'caption', [{
      url: 'data:image/png;base64,YQ==', mimeType: 'image/png',
    }]), 'response-ok')
  } finally {
    legacy.configureRuntimeFetch()
  }
  assert.equal(calls.length, 2)
  assert.equal(calls.every((call) => call.url === 'https://api.openai.com/v1/responses'), true)
  assert.equal(calls[0].body.model, 'gpt-5.5-pro')
  assert.equal(calls[0].body.instructions, 'system')
  assert.equal(calls[0].body.store, false)
  assert.deepEqual(calls[0].body.input, 'user')
  assert.equal(calls[1].body.input[0].content[1].type, 'input_image')
})

test('OpenRouter Gemini 3, Astra and Fable text and vision omit unsupported sampling overrides', async () => {
  const legacy = await loadLegacy()
  const bodies: any[] = []
  legacy.configureRuntimeFetch(async (_input, init) => {
    bodies.push(JSON.parse(String(init?.body || '{}')))
    return Response.json({ choices: [{ message: { content: 'ok' } }] })
  })
  try {
    for (const id of ['google/gemini-3.7-flash', 'google/gemini-3.8-flash', 'openai/gpt-6-astra', 'openai/gpt-6-astra-pro', 'anthropic/claude-fable-5.1']) {
      assert.equal(await legacy.callTextModel('openrouter', `openrouter/${id}`, 'key', 'system', 'user'), 'ok')
      assert.equal(await legacy.callVisionModel('openrouter', `openrouter/${id}`, 'key', 'method', 'caption', [{
        url: 'https://images.invalid/reference.png', mimeType: 'image/png',
      }]), 'ok')
    }
  } finally {
    legacy.configureRuntimeFetch()
  }
  assert.equal(bodies.length, 10)
  for (const body of bodies) assert.doesNotMatch(JSON.stringify(body), /temperature|topP|topK|top_p|top_k/)
})

test('September catalog distinguishes documented visual, text-only and image models without inference', async () => {
  const legacy = await loadLegacy()
  legacy.configureRuntimeFetch(async () => { throw new Error('Static catalog must not call providers') })
  try {
    const expected = {
      gemini: { 'gemini-3.8-flash': ['main', 'vision'] },
      openai: { 'gpt-6-astra': ['main', 'vision'] },
      bailian: {
        'qwen3.8-max': ['main', 'vision'], 'qwen3.8-max-0902': ['main', 'vision'],
        'qwen3.8-flash': ['main', 'vision'], 'qwen3.8-27b': ['main', 'vision'],
        'qwen3.8-2.4t-a95b': ['main'], 'deepseek-v4-pro-0813': ['main'],
        'deepseek-v4-flash-0731': ['main'], 'ZHIPU/GLM-5.3': ['main'],
        'ZHIPU/GLM-5.3-Flash': ['main', 'vision'], 'kimi-k3': ['main', 'vision'],
        'qwen-image-3.0': ['image'],
      },
    }
    for (const [provider, models] of Object.entries(expected)) {
      const registry = await legacy.default({
        request: { method: 'POST' }, body: { action: 'modelRegistry', provider }, headers: {},
        response: { setHeader() {}, status() {} },
      })
      assert.equal(registry.code, 0)
      for (const [id, roles] of Object.entries(models)) {
        const model = registry.providers[provider].models.find((entry: any) => entry.id === id)
        assert.ok(model, id)
        assert.deepEqual(model.roles, roles, id)
        assert.equal(model.verified, false, id)
        assert.equal(model.verificationState, 'catalog', id)
        assert.equal(model.selectable, true, id)
        assert.match(model.officialSourceUrl, /^https:\/\//, id)
        assert.equal(model.capabilities.referenceImages, roles.includes('vision') || roles.includes('image'), id)
      }
    }
  } finally { legacy.configureRuntimeFetch() }
})

test('Astra uses the declared Responses route for planning with images and independent vision', async () => {
  const legacy = await loadLegacy()
  const calls: any[] = []
  legacy.configureRuntimeFetch(async (input, init) => {
    assert.equal(String(input), 'https://api.openai.com/v1/responses')
    calls.push(JSON.parse(String(init?.body)))
    return Response.json({ output: [{ type: 'message', content: [{ type: 'output_text', text: 'ok' }] }] })
  })
  try {
    const images = [{ url: 'https://images.invalid/reference.png', mimeType: 'image/png' }]
    assert.equal(await legacy.callTextModel('openai', 'gpt-6-astra', 'fixture-key', 'system', 'user', images), 'ok')
    assert.equal(await legacy.callVisionModel('openai', 'gpt-6-astra', 'fixture-key', 'method', 'caption', images), 'ok')
    assert.equal(calls.length, 2)
    for (const body of calls) {
      assert.equal(body.model, 'gpt-6-astra')
      assert.equal(body.store, false)
      assert.equal(body.input[0].content[1].type, 'input_image')
      assert.equal(body.input[0].content[1].image_url, images[0].url)
      assert.equal(Object.hasOwn(body, 'temperature'), false)
    }
  } finally { legacy.configureRuntimeFetch() }
})

test('Required style-reference image models stay unavailable even with declared SVG output', async () => {
  const legacy = await loadLegacy()
  const id = 'recraft/recraft-v4-styles-vector'
  legacy.configureRuntimeFetch(async (input) => {
    if (String(input).endsWith('/api/v1/models')) return Response.json({ data: [] })
    if (String(input).endsWith('/images/models')) return Response.json({ data: [{
      id, name: 'Recraft V4 Styles Vector', architecture: { input_modalities: ['text', 'image'], output_modalities: ['image'] },
      supported_parameters: { output_format: { values: ['svg'] }, input_references: { min: 1, max: 10 } },
    }] })
    throw new Error('Unavailable style models must not trigger inference')
  })
  try {
    const registry = await legacy.default({
      request: { method: 'POST' }, body: { action: 'modelRegistry', provider: 'openrouter' }, headers: {},
      response: { setHeader() {}, status() {} },
    })
    const entry = registry.providers.openrouter.models.find((model: any) => model.id === id)
    assert.equal(entry, undefined)
    await assert.rejects(legacy.callImageModel('openrouter', id, 'fixture-key', 'diagram', '1:1', '', ''), /requires style references/)
  } finally { legacy.configureRuntimeFetch() }
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
  assert.deepEqual(models, ['glm-5.2', 'qwen3.7-plus'])
})

test('Bailian application-level image errors retain a concrete provider response status', async () => {
  const legacy = await loadLegacy()
  const responses = [
    Response.json({ status_code: 403, code: 'AccessDenied', message: 'model entitlement missing' }),
    Response.json({ code: 'InvalidParameter', message: 'request rejected before generation' }),
  ]
  legacy.configureRuntimeFetch(async () => responses.shift()!)
  try {
    await assert.rejects(
      legacy.callImageModel('bailian', 'qwen-image-3.0-pro', 'key', 'diagram', '16:9', '', '2K'),
      (error: unknown) => error instanceof Error && (error as Error & { status?: number }).status === 403,
    )
    await assert.rejects(
      legacy.callImageModel('bailian', 'qwen-image-3.0-pro', 'key', 'diagram', '16:9', '', '2K'),
      (error: unknown) => error instanceof Error && (error as Error & { status?: number }).status === 422,
    )
  } finally {
    legacy.configureRuntimeFetch()
  }
})

test('OpenRouter routes every dedicated image catalog model to POST /images', async () => {
  const legacy = await loadLegacy()
  const calls: Array<{ url: string; body: any }> = []
  const textAndImageModel = {
    id: 'google/gemini-3.1-flash-image',
    name: 'Nano Banana 2',
    architecture: { input_modalities: ['text', 'image'], output_modalities: ['text', 'image'] },
    supported_parameters: { aspect_ratio: { values: ['16:9'] }, output_format: { values: ['png'] } },
  }
  const dedicatedModel = {
    id: 'black-forest-labs/flux.2-pro',
    name: 'FLUX.2 Pro',
    architecture: { input_modalities: ['text', 'image'], output_modalities: ['image'] },
    supported_parameters: {
      aspect_ratio: { values: ['1:1', '16:9'] },
      resolution: { values: ['1K', '2K'] },
      input_references: { max: 1 },
      output_format: { values: ['png'] },
    },
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
            id: 'google/gemini-3.6-flash',
            name: 'Gemini 3.6 Flash',
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
            resolution: { type: 'enum', values: ['512', '4K', '2K', '1K', 'AUTO'] },
            input_references: { type: 'range', min: 0, max: 1 },
            output_format: { type: 'enum', values: ['png'] },
          },
        }],
      })
    }
    if (url.endsWith('/api/v1/images')) {
      return Response.json({ data: [{ b64_json: onePixelPngBase64, media_type: 'image/png' }] })
    }
    if (url.endsWith('/chat/completions')) {
      return Response.json({ choices: [{ message: { images: [{ image_url: { url: 'data:image/png;base64,Y2hhdA==' } }] } }] })
    }
    throw new Error(`unexpected request: ${url}`)
  })
  try {
    assert.equal(
      await legacy.callImageModel('openrouter', 'openrouter/black-forest-labs/flux.2-pro', 'key', 'diagram', '16:9', 'data:image/png;base64,YQ==', '2K'),
      onePixelPngBase64,
    )
    assert.equal(
      await legacy.callImageModel('openrouter', 'openrouter/google/gemini-3.1-flash-image', 'key', 'diagram', '16:9', '', '2K'),
      onePixelPngBase64,
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
    assert.deepEqual(registryModels.get('google/gemini-3.6-flash')?.roles, ['main', 'vision'])
    assert.equal(registryModels.get('black-forest-labs/flux.2-pro')?.vendor, 'Black Forest Labs')
    assert.deepEqual(registryModels.get('black-forest-labs/flux.2-pro')?.inputModalities, ['text', 'image'])
    assert.equal(registryModels.get('black-forest-labs/flux.2-pro')?.capabilities.imageEditMode, 'direct-edit')
    assert.deepEqual(registryModels.get('black-forest-labs/flux.2-pro')?.capabilities.refineResolutions, ['512', '1K', '2K', '4K'])
    assert.deepEqual(registryModels.get('google/gemini-3.1-flash-image')?.capabilities.refineResolutions, [])
    assert.match(registryModels.get('black-forest-labs/flux.2-pro')?.roleReasons.image, /Dedicated Image API/)
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
    output_format: 'png',
    input_references: [{ type: 'image_url', image_url: { url: 'data:image/png;base64,YQ==' } }],
  })
  assert.equal(calls.some((call) => call.url.endsWith('/chat/completions')), false)
  assert.equal(calls.some((call) => call.url.endsWith('/images/generations')), false)
  assert.equal(
    calls.some((call) => call.url.endsWith('/chat/completions') && call.body?.model === 'black-forest-labs/flux.2-pro'),
    false,
  )
})

test('OpenRouter refinement execution rejects resolution catalog drift instead of falling back', async () => {
  const legacy = await loadLegacy()
  const model = {
    id: 'vendor/drifted-image',
    name: 'Drifted Image',
    architecture: { input_modalities: ['text'], output_modalities: ['image'] },
    supported_parameters: {
      resolution: { values: ['2K'] },
      output_format: { values: ['png'] },
    },
  }
  let generated = false
  legacy.configureRuntimeFetch(async (input) => {
    const url = String(input)
    if (url.endsWith('/images/models')) return Response.json({ data: [model] })
    if (url.endsWith('/api/v1/images')) {
      generated = true
      return Response.json({ data: [{ b64_json: 'aW1hZ2U=', media_type: 'image/png' }] })
    }
    throw new Error(`unexpected request: ${url}`)
  })
  try {
    await assert.rejects(
      legacy.callImageModel('openrouter', `openrouter/${model.id}`, 'key', 'redraw exactly at 4K', '16:9', '', '4K', true),
      /vendor\/drifted-image no longer declares requested refinement resolution 4K/,
    )
    assert.equal(generated, false)
  } finally {
    legacy.configureRuntimeFetch()
  }
})

test('OpenRouter official releases sort first without promoting recommendation badges', async () => {
  const legacy = await loadLegacy()
  const textModels = [
    { id: 'vendor/zeta', name: 'Aardvark', architecture: { input_modalities: ['text'], output_modalities: ['text'] } },
    { id: 'openai/gpt-5.6-sol', name: 'GPT-5.6 Sol', created: 1780000000, architecture: { input_modalities: ['text', 'image'], output_modalities: ['text'] } },
    { id: 'google/gemini-3.7-flash', name: 'Gemini 3.7 Flash', created: 1780000001, architecture: { input_modalities: ['text', 'image'], output_modalities: ['text'] } },
  ]
  const imageModels = [
    {
      id: 'vendor/alpha', name: 'Alpha Image',
      architecture: { input_modalities: ['text'], output_modalities: ['image'] },
      supported_parameters: { output_format: { values: ['png'] } },
    },
    {
      id: 'sourceful/riverflow-v2.5-pro', name: 'Riverflow 2.5 Pro',
      architecture: { input_modalities: ['text', 'image'], output_modalities: ['image'] },
      supported_parameters: { output_format: { values: ['png'] }, input_references: { max: 4 } },
    },
  ]
  legacy.configureRuntimeFetch(async (input) => {
    const url = String(input)
    if (url.endsWith('/api/v1/models')) return Response.json({ data: textModels })
    if (url.endsWith('/images/models')) return Response.json({ data: imageModels })
    throw new Error(`unexpected request: ${url}`)
  })
  try {
    const registry = await legacy.default({
      request: { method: 'POST' }, body: { action: 'modelRegistry', provider: 'openrouter' }, headers: {},
      response: { setHeader() {}, status() {} },
    })
    assert.deepEqual(registry.providers.openrouter.models.map((model: any) => model.id), [
      'google/gemini-3.7-flash', 'openai/gpt-5.6-sol', 'vendor/zeta', 'vendor/alpha', 'sourceful/riverflow-v2.5-pro',
    ])
    assert.equal(registry.providers.openrouter.models.length, 5)
    assert.equal(registry.providers.openrouter.models[0].recommended, true)
    assert.equal(registry.providers.openrouter.models[1].recommended, true)
    assert.equal(registry.providers.openrouter.models[4].recommended, true)
    assert.deepEqual(registry.providers.openrouter.defaults, {
      main: 'openai/gpt-5.6-sol',
      image: 'sourceful/riverflow-v2.5-pro',
      vision: 'google/gemini-3.7-flash',
    })
    assert.equal(registry.providers.openrouter.accessKind, 'aggregator')
    assert.equal(registry.providers.openrouter.routeContractVersion, 1)
    assert.equal(registry.providers.openrouter.accountCatalogRequired, false)
    for (const model of registry.providers.openrouter.models) {
      assert.equal(model.releasedAt, model.id === 'google/gemini-3.7-flash' ? '2026-08-13' : null, `${model.id} uses an official release source, never OpenRouter created`)
      assert.match(model.officialSourceUrl, /^https:\/\//)
    }
  } finally {
    legacy.configureRuntimeFetch()
  }
})

test('OpenRouter global catalog reports catalog compatibility without inventing lifecycle or paid verification', async () => {
  const legacy = await loadLegacy()
  const textModels = [
    {
      id: 'openai/gpt-5.6-sol', name: 'GPT-5.6 Sol',
      architecture: { input_modalities: ['text', 'image'], output_modalities: ['text'] },
    },
    {
      id: 'vendor/production-like', name: 'Production-like Model',
      architecture: { input_modalities: ['text'], output_modalities: ['text'] },
    },
    {
      id: 'vendor/model-preview', name: 'Model Preview',
      architecture: { input_modalities: ['text'], output_modalities: ['text'] },
    },
  ]
  const imageModels = [
    {
      id: 'vendor/image-preview', name: 'Image Preview',
      architecture: { input_modalities: ['text'], output_modalities: ['image'] },
      supported_parameters: { output_format: { values: ['png'] } },
    },
  ]
  legacy.configureRuntimeFetch(async (input) => {
    const url = String(input)
    if (url.endsWith('/api/v1/models')) return Response.json({ data: textModels })
    if (url.endsWith('/images/models')) return Response.json({ data: imageModels })
    throw new Error(`unexpected request: ${url}`)
  })
  try {
    const registry = await legacy.default({
      request: { method: 'POST' }, body: { action: 'modelRegistry', provider: 'openrouter' }, headers: {},
      response: { setHeader() {}, status() {} },
    })
    assert.equal(registry.registryVersion, '2026-09-09.v16')
    const models = new Map<string, any>(registry.providers.openrouter.models.map((entry: any) => [entry.id, entry]))
    assert.equal(models.get('openai/gpt-5.6-sol')?.lifecycle, 'stable', 'curated stable default remains stable')
    for (const id of ['vendor/production-like', 'vendor/model-preview', 'vendor/image-preview']) {
      const model = models.get(id)
      assert.equal(model.lifecycle, 'unknown', `${id} has no authoritative lifecycle`)
      assert.equal(model.verified, false, `${id} was not exercised with a paid request`)
      assert.equal(model.verificationState, 'catalog', `${id} is only present and protocol-compatible in the global catalog`)
      assert.equal(model.releasedAt, null, `${id} keeps an unknown vendor release date`)
    }
  } finally {
    legacy.configureRuntimeFetch()
  }
})

test('OpenRouter refuses a claimed direct edit when input_references is absent', async () => {
  const legacy = await loadLegacy()
  let generated = false
  const model = {
    id: 'vendor/text-to-image-only', name: 'Text to Image Only',
    architecture: { input_modalities: ['text'], output_modalities: ['image'] },
    supported_parameters: { aspect_ratio: { values: ['16:9'] }, output_format: { values: ['png'] } },
  }
  legacy.configureRuntimeFetch(async (input) => {
    const url = String(input)
    if (url.endsWith('/images/models')) return Response.json({ data: [model] })
    if (url.endsWith('/api/v1/images')) { generated = true; return Response.json({ data: [{ b64_json: 'aW1hZ2U=' }] }) }
    throw new Error(`unexpected request: ${url}`)
  })
  try {
    await assert.rejects(
      legacy.callImageModel('openrouter', `openrouter/${model.id}`, 'key', 'edit it', '16:9', 'data:image/png;base64,YQ=='),
      /does not support input_references; direct edit is unavailable/,
    )
    assert.equal(generated, false)
  } finally {
    legacy.configureRuntimeFetch()
  }
})

test('modelCapability returns UI-usable model-level refine mode and reason', async () => {
  const legacy = await loadLegacy()
  const context = (provider: string, model: string) => ({
    request: { method: 'POST' }, body: { action: 'modelCapability', provider, model }, headers: {},
    response: { setHeader() {}, status() {} },
  })
  const direct = await legacy.default(context('openai', 'gpt-image-2'))
  assert.equal(direct.status, 'supported')
  assert.equal(direct.refineMode, 'direct-edit')
  assert.equal(direct.supportsDirectEdit, true)
  assert.match(direct.refineReason, /source image/i)

  const redraw = await legacy.default(context('bailian', 'z-image-turbo'))
  assert.equal(redraw.refineMode, 'analyze-redraw')
  assert.equal(redraw.supportsDirectEdit, false)
  assert.match(redraw.refineReason, /analy/i)
})

test('referenceLibrary paginates the full bench scope before signing only the current page', async () => {
  const legacy = await loadLegacy()
  const state = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  state.referenceRows = Array.from({ length: 15 }, (_, index) => ({
    id: `ref_${index}`,
    taskName: index < 6 ? 'diagram' : 'plot',
    title: `English source ${index}`,
    summary: `Searchable source summary ${index}`,
    titleZh: `中文标题${index}`,
    shortIntroZh: `这是第 ${index} 个案例的简短说明。`,
    detailZh: `该案例使用编号 ${index} 的数据与视觉结构，详细呈现研究方法与结果。`,
    visualCategory: index % 2 ? '折线图' : '方法框架图',
    researchDomain: index % 3 ? '计算机视觉' : '生命科学',
    keywords: [`keyword-${index}`, index % 2 ? '趋势' : '流程'],
    imageObjectKey: `references/bench/${index}.jpg`,
    source: 'paperbanana-bench',
    corpusVersion: 'zh-CN.v2',
  }))
  state.referenceRows.push({
    id: 'paperbanana-style-internal', taskName: 'diagram', title: 'Internal fallback', summary: '',
    imageObjectKey: '', source: 'paperbanana-fallback',
  })
  state.referenceFindQueries = []
  state.signedReferenceKeys = []

  const result = await legacy.default({
    request: { method: 'POST' },
    body: { action: 'referenceLibrary' },
    headers: {},
    response: { setHeader() {}, status() {} },
  })

  assert.equal(result.code, 0)
  assert.equal(result.corpusVersion, 'zh-CN.v2')
  assert.equal(result.totalItems, 15)
  assert.equal(result.totalPages, 2)
  assert.equal(result.page, 1)
  assert.equal(result.pageSize, 12)
  assert.equal(result.references.length, 12)
  assert.equal(result.references.some((item: any) => item.source === 'paperbanana-fallback'), false)
  assert.equal(state.signedReferenceKeys.length, 12, 'only current-page image objects may be signed')
  assert.deepEqual(result.facets.visualCategories, [
    { value: '方法框架图', count: 8 },
    { value: '折线图', count: 7 },
  ])
})

test('referenceLibrary applies English search and both facets before pagination across task names', async () => {
  const legacy = await loadLegacy()
  const state = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  state.referenceRows = [
    {
      id: 'ref_250', taskName: 'diagram', title: 'Cell architecture', summary: 'biology workflow',
      titleZh: '细胞架构', shortIntroZh: '展示细胞流程。', detailZh: '详细展示细胞模块间的处理流程。',
      visualCategory: '方法框架图', researchDomain: '生命科学', keywords: ['cell'],
      imageObjectKey: 'references/bench/diagram/ref_250.jpg', source: 'paperbanana-bench', corpusVersion: 'zh-CN.v2',
    },
    {
      id: 'ref_7', taskName: 'plot', title: 'Cell response curve', summary: 'biology measurements',
      titleZh: '细胞响应曲线', shortIntroZh: '比较细胞响应变化。', detailZh: '用曲线详细展示细胞测量值的趋势。',
      visualCategory: '折线图', researchDomain: '生命科学', keywords: ['cell'],
      imageObjectKey: 'references/bench/plot/ref_7.jpg', source: 'paperbanana-bench', corpusVersion: 'zh-CN.v2',
    },
    {
      id: 'ref_8', taskName: 'plot', title: 'Vision benchmark', summary: 'computer vision scores',
      titleZh: '视觉基准', shortIntroZh: '比较模型得分。', detailZh: '详细比较不同视觉模型的得分。',
      visualCategory: '折线图', researchDomain: '计算机视觉', keywords: ['vision'],
      imageObjectKey: 'references/bench/plot/ref_8.jpg', source: 'paperbanana-bench', corpusVersion: 'zh-CN.v2',
    },
  ]
  state.signedReferenceKeys = []

  const result = await legacy.default({
    request: { method: 'POST' },
    body: {
      action: 'referenceLibrary', scope: 'bench', query: 'biology',
      visualCategory: '折线图', researchDomain: '生命科学', page: 1, pageSize: 1,
    },
    headers: {},
    response: { setHeader() {}, status() {} },
  })

  assert.equal(result.totalItems, 1)
  assert.deepEqual(result.references.map((item: any) => item.id), ['ref_7'])
  assert.equal(state.signedReferenceKeys.length, 1)
  assert.deepEqual(result.facets.researchDomains, [{ value: '生命科学', count: 2 }])
  assert.deepEqual(result.facets.visualCategories, [
    { value: '方法框架图', count: 1 },
    { value: '折线图', count: 1 },
  ])
})

test('referenceLibrary keeps legacy taskName and limit callers compatible', async () => {
  const legacy = await loadLegacy()
  const state = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  state.referenceRows = Array.from({ length: 5 }, (_, index) => ({
    id: `ref_${index}`, taskName: index < 2 ? 'diagram' : 'plot', title: `Plot ${index}`, summary: '',
    titleZh: `图表${index}`, shortIntroZh: `图表${index}简介。`, detailZh: `图表${index}的详细说明。`,
    visualCategory: '折线图', researchDomain: '综合研究', keywords: ['plot'],
    imageObjectKey: `references/bench/plot/${index}.jpg`, source: 'paperbanana-bench', corpusVersion: 'zh-CN.v2',
  }))
  const result = await legacy.default({
    request: { method: 'POST' },
    body: { action: 'referenceLibrary', taskName: 'plot', limit: 2 },
    headers: {},
    response: { setHeader() {}, status() {} },
  })
  assert.equal(result.pageSize, 2)
  assert.equal(result.totalItems, 3)
  assert.equal(result.references.length, 2)
  assert.equal(result.references.every((item: any) => item.taskName === 'plot'), true)
})

test('referenceLibrary rejects malformed page and pageSize values with a stable 400 envelope', async () => {
  const legacy = await loadLegacy()
  const context = (body: Record<string, unknown>) => legacy.default({
    request: { method: 'POST' }, body: { action: 'referenceLibrary', ...body }, headers: {},
    response: { setHeader() {}, status() {} },
  })
  const malformedPage = await context({ page: 'abc' })
  assert.equal(malformedPage.code, 400)
  assert.match(malformedPage.error, /page must be a positive integer/i)

  const fractionalPageSize = await context({ pageSize: 1.5 })
  assert.equal(fractionalPageSize.code, 400)
  assert.match(fractionalPageSize.error, /pageSize must be a positive integer/i)
})

test('referenceLibrary exact-ID mode queries only requested bench rows, preserves order, and signs only them', async () => {
  const legacy = await loadLegacy()
  const state = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  state.referenceRows = [
    {
      id: 'ref_2', taskName: 'plot', title: 'Second', summary: '', titleZh: '第二项',
      shortIntroZh: '第二项简介。', detailZh: '第二项详细说明。', visualCategory: '折线图',
      researchDomain: '生命科学', keywords: ['second'], imageObjectKey: 'references/bench/plot/ref_2.jpg',
      source: 'paperbanana-bench', corpusVersion: 'zh-CN.v2',
    },
    {
      id: 'ref_9', taskName: 'diagram', title: 'Ninth', summary: '', titleZh: '第九项',
      shortIntroZh: '第九项简介。', detailZh: '第九项详细说明。', visualCategory: '方法框架图',
      researchDomain: '人工智能', keywords: ['ninth'], imageObjectKey: 'references/bench/diagram/ref_9.jpg',
      source: 'paperbanana-bench', corpusVersion: 'zh-CN.v2',
    },
    {
      id: 'ref_other', taskName: 'diagram', title: 'Other', summary: '', titleZh: '其他项',
      shortIntroZh: '其他项简介。', detailZh: '其他项详细说明。', visualCategory: '方法框架图',
      researchDomain: '人工智能', keywords: ['other'], imageObjectKey: 'references/bench/diagram/ref_other.jpg',
      source: 'paperbanana-bench', corpusVersion: 'zh-CN.v2',
    },
  ]
  state.referenceFindQueries = []
  state.signedReferenceKeys = []

  const result = await legacy.default({
    request: { method: 'POST' },
    body: { action: 'referenceLibrary', referenceIds: [' ref_9 ', 'ref_2'] },
    headers: {}, response: { setHeader() {}, status() {} },
  })

  assert.equal(result.code, 0)
  assert.deepEqual(result.references.map((reference: any) => reference.id), ['ref_9', 'ref_2'])
  assert.deepEqual(state.referenceFindQueries.at(-1), {
    id: { $in: ['ref_9', 'ref_2'] },
    source: 'paperbanana-bench',
    corpusVersion: 'zh-CN.v2',
  })
  assert.deepEqual(state.signedReferenceKeys, [
    'references/bench/diagram/ref_9.jpg',
    'references/bench/plot/ref_2.jpg',
  ])
  assert.deepEqual(
    { page: result.page, pageSize: result.pageSize, totalItems: result.totalItems, totalPages: result.totalPages },
    { page: 1, pageSize: 2, totalItems: 2, totalPages: 1 },
  )
})

test('referenceLibrary exact-ID mode rejects filters and malformed selections with stable 400 errors', async () => {
  const legacy = await loadLegacy()
  const state = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  state.referenceFindQueries = []
  const invoke = (body: Record<string, unknown>) => legacy.default({
    request: { method: 'POST' }, body: { action: 'referenceLibrary', ...body }, headers: {},
    response: { setHeader() {}, status() {} },
  })

  for (const field of ['page', 'pageSize', 'query', 'visualCategory', 'researchDomain', 'taskName']) {
    const result = await invoke({ referenceIds: ['ref_1'], [field]: field === 'page' || field === 'pageSize' ? 1 : 'value' })
    assert.equal(result.code, 400, field)
    assert.equal(result.businessCode, 'REFERENCE_LIBRARY_REQUEST_INVALID', field)
  }
  for (const referenceIds of [
    null,
    [],
    'ref_1',
    ['ref_1', ' ref_1 '],
    [''],
    [42],
    ['x'.repeat(121)],
    Array.from({ length: 7 }, (_, index) => `ref_${index}`),
  ]) {
    const result = await invoke({ referenceIds })
    assert.equal(result.code, 400, JSON.stringify(referenceIds))
    assert.equal(result.businessCode, 'REFERENCE_LIBRARY_REQUEST_INVALID', JSON.stringify(referenceIds))
  }
  assert.equal(state.referenceFindQueries.length, 0)
})

test('referenceLibrary exact-ID mode rejects scope with a stable 400 before querying', async () => {
  const legacy = await loadLegacy()
  const state = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  state.referenceFindQueries = []
  const result = await legacy.default({
    request: { method: 'POST' },
    body: { action: 'referenceLibrary', referenceIds: ['ref_1'], scope: 'bench' },
    headers: {}, response: { setHeader() {}, status() {} },
  })
  assert.equal(result.code, 400)
  assert.equal(result.businessCode, 'REFERENCE_LIBRARY_REQUEST_INVALID')
  assert.match(result.error, /referenceIds.*scope/i)
  assert.equal(state.referenceFindQueries.length, 0)
})

test('referenceLibrary exact-ID mode rejects legacy limit with a stable 400 before querying', async () => {
  const legacy = await loadLegacy()
  const state = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  state.referenceFindQueries = []
  const result = await legacy.default({
    request: { method: 'POST' },
    body: { action: 'referenceLibrary', referenceIds: ['ref_1'], limit: 1 },
    headers: {}, response: { setHeader() {}, status() {} },
  })
  assert.equal(result.code, 400)
  assert.equal(result.businessCode, 'REFERENCE_LIBRARY_REQUEST_INVALID')
  assert.match(result.error, /referenceIds.*limit/i)
  assert.equal(state.referenceFindQueries.length, 0)
})

test('referenceLibrary exact-ID mode returns a stable 422 when any requested image is unusable', async () => {
  const legacy = await loadLegacy()
  const state = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  state.referenceRows = [{
    id: 'ref_no_image', taskName: 'plot', title: 'No image', summary: '', titleZh: '无图',
    shortIntroZh: '无图简介。', detailZh: '无图详细说明。', visualCategory: '折线图',
    researchDomain: '综合研究', keywords: [], imageObjectKey: '  ', imageUrl: '\t',
    source: 'paperbanana-bench', corpusVersion: 'zh-CN.v2',
  }]
  state.signedReferenceKeys = []
  const result = await legacy.default({
    request: { method: 'POST' },
    body: { action: 'referenceLibrary', referenceIds: ['ref_no_image', 'ref_missing'] },
    headers: {}, response: { setHeader() {}, status() {} },
  })
  assert.equal(result.code, 422)
  assert.equal(result.businessCode, 'REFERENCE_LIBRARY_SELECTION_INVALID')
  assert.match(result.error, /ref_no_image/)
  assert.match(result.error, /ref_missing/)
  assert.deepEqual(state.signedReferenceKeys, [])
})

test('manual reference selection queries exact IDs directly, preserves order, and reaches beyond the old 200-row boundary', async () => {
  const legacy = await loadLegacy()
  const state = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  state.referenceRows = Array.from({ length: 251 }, (_, index) => ({
    id: `ref_${index}`, taskName: index < 240 ? 'plot' : 'diagram', title: `Reference ${index}`, summary: '',
    titleZh: `参考${index}`, shortIntroZh: `参考${index}简介。`, detailZh: `参考${index}的详细说明。`,
    visualCategory: '方法框架图', researchDomain: '综合研究', keywords: ['reference'],
    imageObjectKey: `references/bench/${index}.jpg`, source: 'paperbanana-bench', corpusVersion: 'zh-CN.v2',
  }))
  state.referenceFindQueries = []
  state.signedReferenceKeys = []

  const selected = await legacy.resolveManualRetrievedReferences(['ref_250', 'ref_1'])

  assert.deepEqual(selected.map((item) => item.id), ['ref_250', 'ref_1'])
  assert.deepEqual(state.referenceFindQueries.at(-1), {
    id: { $in: ['ref_250', 'ref_1'] },
    source: 'paperbanana-bench',
    corpusVersion: 'zh-CN.v2',
  })
  assert.deepEqual(state.signedReferenceKeys, ['references/bench/250.jpg', 'references/bench/1.jpg'])
})

test('automatic and random retrieval exclude internal fallbacks and sign only selected bench rows', async () => {
  const legacy = await loadLegacy()
  const state = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  state.referenceRows = [{
    id: 'ref_240', taskName: 'diagram', title: 'Only bench diagram', summary: 'source summary',
    titleZh: '唯一基准案例', shortIntroZh: '该案例展示基准图示。', detailZh: '该案例用于验证内部回退项不会混入基准检索结果。',
    visualCategory: '方法框架图', researchDomain: '人工智能', keywords: ['bench'],
    imageObjectKey: 'references/bench/diagram/ref_240.jpg', source: 'paperbanana-bench', corpusVersion: 'zh-CN.v2',
  }]
  state.signedReferenceKeys = []

  const single = await legacy.resolveRetrievedReferences({ taskName: 'diagram', retrievalSetting: 'random' }, '')
  assert.deepEqual(single.map((item) => item.id), ['ref_240'])
  assert.deepEqual(state.signedReferenceKeys, ['references/bench/diagram/ref_240.jpg'])

  state.referenceRows = Array.from({ length: 15 }, (_, index) => ({
    id: `ref_${index}`, taskName: 'plot', title: `Plot ${index}`, summary: `Summary ${index}`,
    titleZh: `图表${index}`, shortIntroZh: `图表${index}简介。`, detailZh: `图表${index}的详细说明。`,
    visualCategory: '折线图', researchDomain: '综合研究', keywords: ['plot'],
    imageObjectKey: `references/bench/plot/${index}.jpg`, source: 'paperbanana-bench', corpusVersion: 'zh-CN.v2',
  }))
  state.signedReferenceKeys = []
  const selected = await legacy.resolveRetrievedReferences({ taskName: 'plot', retrievalSetting: 'random' }, '')
  assert.equal(selected.length, 10)
  assert.equal(state.signedReferenceKeys.length, 10, 'discarded random candidates must not be signed')

  state.signedReferenceKeys = []
  legacy.configureRuntimeFetch(async () => Response.json({
    output: [{ type: 'message', content: [{ type: 'output_text', text: '["ref_1", "ref_12"]' }] }],
  }))
  try {
    const automatic = await legacy.resolveRetrievedReferences({
      taskName: 'plot', retrievalSetting: 'auto', provider: 'openai', mainModelName: 'gpt-5.5-pro',
      methodContent: 'Compare representative trends.', caption: 'Trend comparison.',
    }, 'test-key')
    assert.deepEqual(automatic.map((item) => item.id), ['ref_1', 'ref_12'])
    assert.equal(state.signedReferenceKeys.length, 2, 'discarded automatic candidates must not be signed')
  } finally {
    legacy.configureRuntimeFetch()
  }
})

test('manual reference selection fails explicitly for missing, image-less, or oversized selections', async () => {
  const legacy = await loadLegacy()
  const state = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  state.referenceRows = [
    {
      id: 'ref_1', taskName: 'plot', title: 'No image', summary: '', titleZh: '无图案例',
      shortIntroZh: '该案例没有图像。', detailZh: '该案例缺少可用的图像数据。',
      visualCategory: '折线图', researchDomain: '综合研究', keywords: ['missing'],
      imageObjectKey: '', imageUrl: '', source: 'paperbanana-bench', corpusVersion: 'zh-CN.v2',
    },
    {
      id: 'ref_2', taskName: 'plot', title: 'Whitespace image', summary: '', titleZh: '空白图片字段',
      shortIntroZh: '该案例只有空白图片字段。', detailZh: '该案例用于验证空白图片字段不会被当作可用链接。',
      visualCategory: '折线图', researchDomain: '综合研究', keywords: ['missing'],
      imageObjectKey: '   ', imageUrl: '\t', source: 'paperbanana-bench', corpusVersion: 'zh-CN.v2',
    },
  ]

  for (const ids of [
    ['missing-ref'],
    ['ref_1'],
    ['ref_2'],
    Array.from({ length: 11 }, (_, index) => `ref_${index}`),
  ]) {
    await assert.rejects(
      legacy.resolveManualRetrievedReferences(ids),
      (error: any) => {
        assert.equal(error.statusCode, ids.length > 10 ? 400 : 422)
        assert.equal(error.code, ids.length > 10 ? 'REFERENCE_SELECTION_LIMIT' : 'REFERENCE_SELECTION_INVALID')
        return true
      },
    )
  }
})

test('manual reference selection rejects a stale stored URL when fresh object signing fails', async () => {
  const legacy = await loadLegacy()
  const state = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  state.referenceRows = [{
    id: 'ref_250', taskName: 'diagram', title: 'Reference', summary: 'Reference summary',
    titleZh: '可用参考', shortIntroZh: '这是一条可用参考的完整简介。',
    detailZh: '这是一条可用参考的详细中文说明，用于验证对象存储签名失败时不会回退到过期链接。',
    visualCategory: '方法框架图', researchDomain: '人工智能', keywords: ['签名', '参考'],
    imageObjectKey: 'references/bench/diagram/ref_250.jpg',
    imageUrl: 'https://expired.invalid/ref_250.jpg',
    source: 'paperbanana-bench', corpusVersion: 'zh-CN.v2',
  }]
  state.signingFailures = ['references/bench/diagram/ref_250.jpg']
  try {
    await assert.rejects(
      legacy.resolveManualRetrievedReferences(['ref_250']),
      (error: any) => {
        assert.equal(error.statusCode, 422)
        assert.equal(error.code, 'REFERENCE_SELECTION_INVALID')
        return true
      },
    )
  } finally {
    state.signingFailures = []
  }
})

test('createJob returns a stable 4xx business error before admission for an unusable manual reference', async () => {
  const legacy = await loadLegacy()
  const state = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  state.referenceRows = []
  legacy.configureJobAdmission({ maxActive: 0, maxPending: 0, maxPerOwner: 1, maxPerIp: 1 })
  try {
    const result = await legacy.default({
      request: { method: 'POST' },
      body: {
        action: 'createJob',
        provider: 'openai',
        apiKeys: { openai: 'selected-key' },
        taskName: 'diagram',
        methodContent: 'A sufficiently detailed method section for validating manual references.',
        caption: 'A valid figure caption.',
        aspectRatio: '3:2',
        mainModelName: 'gpt-5.6-sol',
        imageModelName: 'gpt-image-2',
        referenceVisionModelName: 'gpt-5.6-sol',
        retrievalSetting: 'manual',
        manualReferenceIds: ['missing-ref'],
      },
      headers: {},
      response: { setHeader() {}, status() {} },
    })
    assert.equal(result.code, 422)
    assert.equal(result.businessCode, 'REFERENCE_SELECTION_INVALID')
    assert.match(result.error, /missing-ref/)
  } finally {
    legacy.configureJobAdmission({
      maxActive: Number.MAX_SAFE_INTEGER,
      maxPending: 0,
      maxPerOwner: Number.MAX_SAFE_INTEGER,
      maxPerIp: Number.MAX_SAFE_INTEGER,
    })
  }
})

test('OpenRouter vector image responses are rasterized before the PNG pipeline saves them', async () => {
  const legacy = await loadLegacy()
  const previousWasm = process.env.RESVG_WASM_PATH
  process.env.RESVG_WASM_PATH = path.resolve('../../node_modules/.pnpm/@resvg+resvg-wasm@2.6.2/node_modules/@resvg/resvg-wasm/index_bg.wasm')
  const model = {
    id: 'recraft/recraft-v4.1-pro-vector',
    name: 'Recraft Vector',
    architecture: { input_modalities: ['text'], output_modalities: ['image'] },
    supported_parameters: { aspect_ratio: { type: 'enum', values: ['16:9'] }, output_format: { type: 'enum', values: ['svg'] } },
  }
  legacy.configureRuntimeFetch(async (input) => {
    const url = String(input)
    if (url.endsWith('/models?output_modalities=image')) return Response.json({ data: [model] })
    if (url.endsWith('/api/v1/models')) return Response.json({ data: [] })
    if (url.endsWith('/images/models')) return Response.json({ data: [model] })
    if (url.endsWith('/api/v1/images')) {
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="16"><rect width="32" height="16" fill="#56705f"/></svg>'
      return Response.json({ data: [{ b64_json: Buffer.from(svg).toString('base64'), media_type: 'image/svg+xml' }] })
    }
    throw new Error(`unexpected request: ${url}`)
  })
  try {
    const registry = await legacy.default({
      request: { method: 'POST' }, body: { action: 'modelRegistry', provider: 'openrouter' }, headers: {},
      response: { setHeader() {}, status() {} },
    })
    const entry = registry.providers.openrouter.models.find((candidate: any) => candidate.id === model.id)
    assert.deepEqual(entry.capabilities.outputFormats, ['png'])
    assert.match(entry.roleReasons.image, /normalized PNG/i)
    const png = await legacy.callImageModel('openrouter', `openrouter/${model.id}`, 'key', 'diagram', '16:9')
    assert.deepEqual(Buffer.from(png, 'base64').subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  } finally {
    legacy.configureRuntimeFetch()
    if (previousWasm === undefined) delete process.env.RESVG_WASM_PATH
    else process.env.RESVG_WASM_PATH = previousWasm
  }
})

test('OpenRouter paid-verified default image profiles expose all 34 routes as normalized PNG output', async () => {
  const legacy = await loadLegacy()
  const models = [...paidVerifiedOpenRouterDefaultImageFormats].map(([id, format]) => ({
    id,
    name: id,
    architecture: { input_modalities: ['text'], output_modalities: ['image'] },
    supported_parameters: {
      resolution: { type: 'enum', values: id === 'bytedance-seed/seedream-4.5' ? ['1K', '2K', '4K'] : ['1K'] },
      ...(id === 'sourceful/riverflow-v2.5-fast'
        ? { output_format: { type: 'enum', values: ['jpeg'] } }
        : {}),
    },
    expectedDefaultFormat: format,
  }))
  legacy.configureRuntimeFetch(async (input) => {
    const url = String(input)
    if (url.endsWith('/api/v1/models')) return Response.json({ data: [] })
    if (url.endsWith('/images/models')) return Response.json({ data: models })
    throw new Error(`unexpected request: ${url}`)
  })
  try {
    const registry = await legacy.default({
      request: { method: 'POST' },
      body: { action: 'modelRegistry', provider: 'openrouter' },
      headers: {},
      response: { setHeader() {}, status() {} },
    })
    const entries = new Map<string, any>(registry.providers.openrouter.models.map((model: any) => [model.id, model]))
    assert.equal(entries.size, 34)
    for (const id of paidVerifiedOpenRouterDefaultImageFormats.keys()) {
      const entry = entries.get(id)
      assert.ok(entry, id)
      assert.equal(entry.selectable, true, id)
      assert.deepEqual(entry.roles, ['image'], id)
      assert.deepEqual(entry.capabilities.outputFormats, ['png'], id)
      assert.equal(entry.verificationState, 'catalog', id)
      assert.match(entry.roleReasons.image, /normalized PNG/i, id)
    }
  } finally {
    legacy.configureRuntimeFetch()
  }
})

test('OpenRouter MAI 2.6 and Flash use documented PNG and exact Azure generation/edit', async () => {
  const legacy = await loadLegacy()
  const model = {
    id: 'microsoft/mai-image-2.6', name: 'Microsoft: MAI-Image-2.6',
    architecture: { input_modalities: ['text', 'image'], output_modalities: ['image'] },
    supported_parameters: {
      aspect_ratio: { type: 'enum', values: ['16:9'] },
      n: { type: 'range', min: 1, max: 1 },
      input_references: { type: 'range', min: 0, max: 5 },
    },
  }
  const requests: any[] = []
  let corruptOutput = false
  legacy.configureRuntimeFetch(async (input, init) => {
    const url = String(input)
    if (url.endsWith('/api/v1/models')) return Response.json({ data: [] })
    if (url.endsWith('/images/models')) return Response.json({ data: [model, { ...model, id: `${model.id}-flash` }] })
    if (url.endsWith('/api/v1/images')) {
      requests.push(JSON.parse(String(init?.body || '{}')))
      return Response.json({ data: [{ b64_json: corruptOutput ? Buffer.from('not an image').toString('base64') : onePixelPngBase64 }] })
    }
    throw new Error(`unexpected request: ${url}`)
  })
  try {
    const registry = await legacy.default({
      request: { method: 'POST' }, body: { action: 'modelRegistry', provider: 'openrouter' }, headers: {},
      response: { setHeader() {}, status() {} },
    })
    const entries = new Map<string, any>(registry.providers.openrouter.models.map((entry: any) => [entry.id, entry]))
    const entry = entries.get(model.id)
    assert.equal(entry.selectable, true)
    assert.equal(entry.capabilities.imageEditMode, 'direct-edit')
    assert.deepEqual(entry.capabilities.outputFormats, ['png'])
    assert.deepEqual(entry.capabilities.refineResolutions, [])
    assert.equal(entry.verified, false)
    assert.equal(entry.verificationState, 'catalog')
    assert.match(entry.roleReasons.image, /Provider documentation/)
    assert.doesNotMatch(entry.roleReasons.image, /paid-verified/)
    const flash = entries.get(`${model.id}-flash`)
    assert.equal(flash.selectable, true)
    assert.equal(flash.verified, false)
    assert.equal(flash.verificationState, 'catalog')
    assert.equal(flash.capabilities.imageEditMode, 'direct-edit')
    for (const id of [model.id, `${model.id}-flash`]) {
      for (const source of ['', `data:image/png;base64,${onePixelPngBase64}`]) {
        assert.equal(await legacy.callImageModel('openrouter', id, 'fixture-key', 'fixed scientific task', '16:9', source, ''), onePixelPngBase64)
      }
    }
    assert.deepEqual(requests.map((request) => request.model), [model.id, model.id, `${model.id}-flash`, `${model.id}-flash`])
    assert.equal(requests.length, 4)
    for (const request of requests) {
      assert.equal(request.n, 1)
      assert.equal(request.aspect_ratio, '16:9')
      assert.equal(request.prompt, 'fixed scientific task')
      assert.deepEqual(request.provider, { only: ['azure'], allow_fallbacks: false, options: { azure: { web_grounding: false } } })
      for (const parameter of ['resolution', 'quality', 'seed', 'output_format']) assert.equal(Object.hasOwn(request, parameter), false)
    }
    assert.equal(Object.hasOwn(requests[0], 'input_references'), false)
    assert.equal(requests[1].input_references[0].image_url.url, `data:image/png;base64,${onePixelPngBase64}`)
    corruptOutput = true
    await assert.rejects(legacy.callImageModel('openrouter', model.id, 'fixture-key', 'fixed scientific task', '16:9', '', ''), /unsupported image format/)
  } finally {
    legacy.configureRuntimeFetch()
  }
})

test('OpenRouter paid-profile JPEG responses are converted to real PNG bytes', async () => {
  const legacy = await loadLegacy()
  const model = {
    id: 'bytedance-seed/seedream-5-0-pro',
    name: 'Seedream 5.0 Pro',
    architecture: { input_modalities: ['text'], output_modalities: ['image'] },
    supported_parameters: { aspect_ratio: { type: 'enum', values: ['1:1'] }, resolution: { type: 'enum', values: ['1K', '2K'] } },
  }
  const jpegBase64 = fs.readFileSync(path.resolve(packageRoot, '../web/public/logo.jpg')).toString('base64')
  legacy.configureRuntimeFetch(async (input) => {
    const url = String(input)
    if (url.endsWith('/images/models')) return Response.json({ data: [model] })
    if (url.endsWith('/api/v1/images')) {
      return Response.json({ data: [{ b64_json: jpegBase64, media_type: 'image/jpeg' }] })
    }
    throw new Error(`unexpected request: ${url}`)
  })
  try {
    const png = await legacy.callImageModel('openrouter', `openrouter/${model.id}`, 'key', 'diagram', '1:1', '', '1K')
    assert.deepEqual(Buffer.from(png, 'base64').subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  } finally {
    legacy.configureRuntimeFetch()
  }
})

test('OpenRouter paid-profile WebP responses are converted to real PNG bytes', async () => {
  const legacy = await loadLegacy()
  const model = {
    id: 'recraft/recraft-v4',
    name: 'Recraft V4',
    architecture: { input_modalities: ['text'], output_modalities: ['image'] },
    supported_parameters: { aspect_ratio: { type: 'enum', values: ['1:1'] } },
  }
  legacy.configureRuntimeFetch(async (input) => {
    const url = String(input)
    if (url.endsWith('/images/models')) return Response.json({ data: [model] })
    if (url.endsWith('/api/v1/images')) {
      return Response.json({ data: [{ b64_json: onePixelWebpBase64, media_type: 'image/webp' }] })
    }
    throw new Error(`unexpected request: ${url}`)
  })
  try {
    const png = await legacy.callImageModel('openrouter', `openrouter/${model.id}`, 'key', 'diagram', '1:1')
    assert.deepEqual(Buffer.from(png, 'base64').subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  } finally {
    legacy.configureRuntimeFetch()
  }
})

test('OpenRouter rejects a WebP with bytes outside its declared RIFF container', async () => {
  const legacy = await loadLegacy()
  const model = {
    id: 'recraft/recraft-v4',
    name: 'Recraft V4',
    architecture: { input_modalities: ['text'], output_modalities: ['image'] },
    supported_parameters: { aspect_ratio: { type: 'enum', values: ['1:1'] } },
  }
  const trailingGarbage = Buffer.concat([
    Buffer.from(onePixelWebpBase64, 'base64'),
    Buffer.from('untrusted-trailing-bytes'),
  ]).toString('base64')
  legacy.configureRuntimeFetch(async (input) => {
    const url = String(input)
    if (url.endsWith('/images/models')) return Response.json({ data: [model] })
    if (url.endsWith('/api/v1/images')) {
      return Response.json({ data: [{ b64_json: trailingGarbage, media_type: 'image/webp' }] })
    }
    throw new Error(`unexpected request: ${url}`)
  })
  try {
    await assert.rejects(
      legacy.callImageModel('openrouter', `openrouter/${model.id}`, 'key', 'diagram', '1:1'),
      /invalid, animated, or oversized WebP dimensions/i,
    )
  } finally {
    legacy.configureRuntimeFetch()
  }
})

test('OpenRouter rejects a truncated PNG signature from a paid profile before persistence', async () => {
  const legacy = await loadLegacy()
  const model = {
    id: 'google/gemini-2.5-flash-image',
    name: 'Gemini 2.5 Flash Image',
    architecture: { input_modalities: ['text'], output_modalities: ['image'] },
    supported_parameters: { aspect_ratio: { type: 'enum', values: ['1:1'] } },
  }
  const pngSignatureOnly = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).toString('base64')
  legacy.configureRuntimeFetch(async (input) => {
    const url = String(input)
    if (url.endsWith('/images/models')) return Response.json({ data: [model] })
    if (url.endsWith('/api/v1/images')) {
      return Response.json({ data: [{ b64_json: pngSignatureOnly, media_type: 'image/png' }] })
    }
    throw new Error(`unexpected request: ${url}`)
  })
  try {
    await assert.rejects(
      legacy.callImageModel('openrouter', `openrouter/${model.id}`, 'key', 'diagram', '1:1'),
      /invalid or oversized PNG dimensions/i,
    )
  } finally {
    legacy.configureRuntimeFetch()
  }
})

test('OpenRouter overrides Seedream 4.5 false 1K catalog metadata with its paid-verified 2K minimum', async () => {
  const legacy = await loadLegacy()
  const model = {
    id: 'bytedance-seed/seedream-4.5',
    name: 'Seedream 4.5',
    architecture: { input_modalities: ['text'], output_modalities: ['image'] },
    supported_parameters: {
      resolution: { type: 'enum', values: ['1K', '2K', '4K'] },
      aspect_ratio: { type: 'enum', values: ['1:1'] },
    },
  }
  const imageCalls: any[] = []
  legacy.configureRuntimeFetch(async (input, init) => {
    const url = String(input)
    if (url.endsWith('/api/v1/models')) return Response.json({ data: [] })
    if (url.endsWith('/images/models')) return Response.json({ data: [model] })
    if (url.endsWith('/api/v1/images')) {
      imageCalls.push(JSON.parse(String(init?.body || '{}')))
      return Response.json({ data: [{ b64_json: onePixelPngBase64, media_type: 'image/png' }] })
    }
    throw new Error(`unexpected request: ${url}`)
  })
  try {
    const registry = await legacy.default({
      request: { method: 'POST' }, body: { action: 'modelRegistry', provider: 'openrouter' }, headers: {},
      response: { setHeader() {}, status() {} },
    })
    const entry = registry.providers.openrouter.models.find((candidate: any) => candidate.id === model.id)
    assert.deepEqual(entry.capabilities.resolutions, ['2K', '4K'])
    assert.deepEqual(entry.capabilities.refineResolutions, ['2K', '4K'])
    await legacy.callImageModel('openrouter', `openrouter/${model.id}`, 'key', 'diagram', '1:1', '', '1K')
    assert.equal(imageCalls.length, 1)
    assert.equal(imageCalls[0].resolution, '2K')
    assert.equal(Object.hasOwn(imageCalls[0], 'output_format'), false)
  } finally {
    legacy.configureRuntimeFetch()
  }
})

test('OpenRouter disables Seedream 4.5 before dispatch when catalog drift offers only sub-2K or unknown resolutions', async () => {
  const legacy = await loadLegacy()
  const model = {
    id: 'bytedance-seed/seedream-4.5',
    name: 'Seedream 4.5',
    architecture: { input_modalities: ['text'], output_modalities: ['image'] },
    supported_parameters: {
      resolution: { type: 'enum', values: ['1K', '512', 'HD'] },
      aspect_ratio: { type: 'enum', values: ['1:1'] },
    },
  }
  let generated = false
  legacy.configureRuntimeFetch(async (input) => {
    const url = String(input)
    if (url.endsWith('/api/v1/models')) return Response.json({ data: [] })
    if (url.endsWith('/images/models')) return Response.json({ data: [model] })
    if (url.endsWith('/api/v1/images')) {
      generated = true
      return Response.json({ data: [{ b64_json: onePixelPngBase64, media_type: 'image/png' }] })
    }
    throw new Error(`unexpected request: ${url}`)
  })
  try {
    const registry = await legacy.default({
      request: { method: 'POST' }, body: { action: 'modelRegistry', provider: 'openrouter' }, headers: {},
      response: { setHeader() {}, status() {} },
    })
    const entry = registry.providers.openrouter.models.find((candidate: any) => candidate.id === model.id)
    assert.equal(entry, undefined)
    await assert.rejects(
      legacy.callImageModel('openrouter', `openrouter/${model.id}`, 'key', 'diagram', '1:1', '', '1K'),
      /no longer declares a supported resolution at or above 2K/i,
    )
    assert.equal(generated, false)
  } finally {
    legacy.configureRuntimeFetch()
  }
})

test('OpenRouter omits incompatible image models while enabling an adapted normalization profile', async () => {
  const legacy = await loadLegacy()
  const normalized = {
    id: 'sourceful/riverflow-v2.5-fast',
    name: 'Riverflow JPEG only',
    architecture: { input_modalities: ['text', 'image'], output_modalities: ['image'] },
    supported_parameters: { aspect_ratio: { type: 'enum', values: ['16:9'] }, output_format: { type: 'enum', values: ['jpeg'] } },
  }
  const incompatible = {
    id: 'example/webp-only',
    name: 'Unknown WebP only',
    architecture: { input_modalities: ['text'], output_modalities: ['image'] },
    supported_parameters: { output_format: { type: 'enum', values: ['webp'] } },
  }
  const safe = {
    id: 'sourceful/riverflow-v2.5-pro',
    name: 'Riverflow PNG capable',
    architecture: { input_modalities: ['text', 'image'], output_modalities: ['image'] },
    supported_parameters: { aspect_ratio: { type: 'enum', values: ['16:9'] }, output_format: { type: 'enum', values: ['png', 'jpeg', 'webp'] } },
  }
  const imageCalls: any[] = []
  legacy.configureRuntimeFetch(async (input, init) => {
    const url = String(input)
    if (url.endsWith('/models?output_modalities=image')) return Response.json({ data: [normalized, incompatible, safe] })
    if (url.endsWith('/api/v1/models')) return Response.json({ data: [] })
    if (url.endsWith('/images/models')) return Response.json({ data: [normalized, incompatible, safe] })
    if (url.endsWith('/api/v1/images')) {
      imageCalls.push(JSON.parse(String(init?.body || '{}')))
      return Response.json({ data: [{ b64_json: onePixelPngBase64, media_type: 'image/png' }] })
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
    const registryModels = new Map<string, any>(registry.providers.openrouter.models.map((model: any) => [model.id, model]))
    const normalizedEntry = registryModels.get(normalized.id)
    assert.equal(normalizedEntry?.selectable, true)
    assert.equal(normalizedEntry?.roles.includes('image'), true)
    assert.deepEqual(normalizedEntry?.capabilities.outputFormats, ['png'])
    assert.match(normalizedEntry?.roleReasons.image, /normalized PNG/i)
    const incompatibleEntry = registryModels.get(incompatible.id)
    assert.equal(incompatibleEntry, undefined)
    assert.equal(registryModels.get(safe.id)?.selectable, true)
    assert.equal(registryModels.get(safe.id)?.roles.includes('image'), true)
    await assert.rejects(
      legacy.callImageModel('openrouter', `openrouter/${incompatible.id}`, 'key', 'diagram', '16:9'),
      /does not expose a PNG or SVG output format/,
    )
    assert.equal(
      await legacy.callImageModel('openrouter', `openrouter/${normalized.id}`, 'key', 'diagram', '16:9'),
      onePixelPngBase64,
    )
    assert.equal(
      await legacy.callImageModel('openrouter', `openrouter/${safe.id}`, 'key', 'diagram', '16:9'),
      onePixelPngBase64,
    )
    assert.equal(imageCalls.length, 2)
    assert.equal(Object.hasOwn(imageCalls[0], 'output_format'), false)
    assert.equal(imageCalls[1].output_format, 'png')
  } finally {
    legacy.configureRuntimeFetch()
  }
})

async function assertOpenRouterUnknownOutputFormatFailsClosed(model: Record<string, any>) {
  const legacy = await loadLegacy()
  let generated = false
  legacy.configureRuntimeFetch(async (input) => {
    const url = String(input)
    if (url.endsWith('/api/v1/models')) return Response.json({ data: [] })
    if (url.endsWith('/images/models')) return Response.json({ data: [model] })
    if (url.endsWith('/api/v1/images')) {
      generated = true
      return Response.json({ data: [{ b64_json: 'aW1hZ2U=', media_type: 'image/png' }] })
    }
    throw new Error(`unexpected request: ${url}`)
  })
  try {
    const registry = await legacy.default({
      request: { method: 'POST' }, body: { action: 'modelRegistry', provider: 'openrouter' }, headers: {},
      response: { setHeader() {}, status() {} },
    })
    const entry = registry.providers.openrouter.models.find((candidate: any) => candidate.id === model.id)
    assert.equal(entry, undefined)
    await assert.rejects(
      legacy.callImageModel('openrouter', `openrouter/${model.id}`, 'key', 'diagram', '16:9'),
      /does not expose a PNG or SVG output format/,
    )
    assert.equal(generated, false)
  } finally {
    legacy.configureRuntimeFetch()
  }
}

test('OpenRouter fails closed when a dedicated image model omits output_format', async () => {
  await assertOpenRouterUnknownOutputFormatFailsClosed({
    id: 'vendor/missing-output-format',
    name: 'Missing Output Format',
    architecture: { input_modalities: ['text'], output_modalities: ['image'] },
    supported_parameters: { resolution: { values: ['1K'] } },
  })
})

test('OpenRouter fails closed when a dedicated image model declares no output_format values', async () => {
  await assertOpenRouterUnknownOutputFormatFailsClosed({
    id: 'vendor/empty-output-format',
    name: 'Empty Output Format',
    architecture: { input_modalities: ['text'], output_modalities: ['image'] },
    supported_parameters: { output_format: { values: [] } },
  })
})

test('GPT Image 2.5 direct aliases and dated snapshots submit valid generation and edit requests', async () => {
  const legacy = await loadLegacy()
  const calls: Array<{url:string; body:any}> = []
  legacy.configureRuntimeFetch(async (input, init) => {
    const url = String(input)
    assert.ok(url === 'https://api.openai.com/v1/images/generations' || url === 'https://api.openai.com/v1/images/edits')
    const body = init?.body instanceof FormData ? Object.fromEntries(init.body.entries()) : JSON.parse(String(init?.body))
    calls.push({url, body})
    return Response.json({data:[{b64_json:onePixelPngBase64}]})
  })
  try {
    for (const variant of ['sunburst','flare']) for (const suffix of ['', '-2026-09-08']) {
      const model = `gpt-image-2.5-${variant}${suffix}`
      for (const editing of [false,true]) {
        assert.equal(await legacy.callImageModel('openai',model,'fixture-only','Scientific figure','16:9',editing?`data:image/png;base64,${onePixelPngBase64}`:'','4K'),onePixelPngBase64)
        const call = calls.at(-1)!
        assert.equal(call.body.model,model)
        assert.equal(call.body.size,'3840x2160')
        assert.equal(call.body.output_format,'png')
        assert.equal(call.body.quality,'high')
        assert.equal(Object.hasOwn(call.body,'input_fidelity'),false)
        assert.equal(Object.hasOwn(call.body,'image'),editing)
      }
      const before = calls.length
      await assert.rejects(legacy.callImageModel('openai',model,'fixture-only','Scientific figure','1:8','','4K'),/Unsupported aspect ratio/)
      assert.equal(calls.length,before)
    }
    assert.equal(calls.length,8)
  } finally { legacy.configureRuntimeFetch() }
})

test('OpenRouter GPT Image 2.5 is selectable from live schema without inventing output format or resolution parameters', async () => {
  const legacy = await loadLegacy()
  const snapshot = JSON.parse(fs.readFileSync(new URL('../../../config/openrouter-catalog-review.json', import.meta.url),'utf8'))
  const cards = snapshot.images.filter((model:any) => /^openai\/gpt-image-2[.]5-(sunburst|flare)$/.test(model.id))
  assert.equal(cards.length,2)
  const bodies:any[] = []
  legacy.configureRuntimeFetch(async (input, init) => {
    const url=String(input)
    if(url.endsWith('/api/v1/models'))return Response.json({data:[]})
    if(url.endsWith('/images/models'))return Response.json({data:cards})
    assert.equal(url,'https://openrouter.ai/api/v1/images')
    bodies.push(JSON.parse(String(init?.body)))
    return Response.json({data:[{b64_json:onePixelPngBase64}]})
  })
  try {
    const response=await legacy.default({request:{method:'POST'},body:{action:'modelRegistry',provider:'openrouter'},headers:{},response:{setHeader(){},status(){}}})
    for(const card of cards) {
      const model=response.providers.openrouter.models.find((m:any)=>m.id===card.id)
      assert.equal(model.selectable,true)
      assert.equal(model.verified,false)
      assert.equal(model.verificationState,'catalog')
      assert.equal(model.capabilities.imageEditing,true)
      assert.equal(model.capabilities.providerMaxReferenceImages,16)
      assert.deepEqual(model.capabilities.resolutions,['auto'])
      assert.deepEqual(model.capabilities.refineResolutions,['auto'])
      assert.match(model.roleReasons.image,/documentation.*PNG/)
      assert.doesNotMatch(model.roleReasons.image,/paid-verified/)
      for(const editing of [false,true]) {
        await legacy.callImageModel('openrouter',card.id,'fixture-only','Scientific figure','21:9',editing?`data:image/png;base64,${onePixelPngBase64}`:'','auto',true)
        const body=bodies.at(-1)
        assert.equal(body.model,card.id)
        assert.equal(body.aspect_ratio,'21:9')
        for(const field of ['resolution','size','output_format'])assert.equal(Object.hasOwn(body,field),false,field)
        assert.equal(Boolean(body.input_references),editing)
      }
      const before=bodies.length
      await assert.rejects(legacy.callImageModel('openrouter',card.id,'fixture-only','Scientific figure','21:9',`data:image/png;base64,${onePixelPngBase64}`,'4K',true),/no longer declares requested refinement resolution/)
      assert.equal(bodies.length,before)
    }
    assert.equal(bodies.length,4)
  } finally { legacy.configureRuntimeFetch() }
})

test('OpenRouter Image 2.5 native size never overrides an explicit or changed resolution descriptor', async () => {
  const snapshot = JSON.parse(fs.readFileSync(new URL('../../../config/openrouter-catalog-review.json', import.meta.url),'utf8'))
  for (const descriptor of [{values:['2K','4K']}, {values:[]}, {type:'range',min:512,max:2048}, null]) {
    const legacy = await loadLegacy()
    const card = structuredClone(snapshot.images.find((model:any)=>model.id==='openai/gpt-image-2.5-sunburst'))
    card.supported_parameters.resolution = descriptor
    const bodies:any[] = []
    legacy.configureRuntimeFetch(async (input,init)=>{
      const url=String(input)
      if(url.endsWith('/api/v1/models'))return Response.json({data:[]})
      if(url.endsWith('/images/models'))return Response.json({data:[card]})
      assert.equal(url,'https://openrouter.ai/api/v1/images')
      bodies.push(JSON.parse(String(init?.body)))
      return Response.json({data:[{b64_json:onePixelPngBase64}]})
    })
    try {
      const registry=await legacy.default({request:{method:'POST'},body:{action:'modelRegistry',provider:'openrouter'},headers:{},response:{setHeader(){},status(){}}})
      const model=registry.providers.openrouter.models.find((entry:any)=>entry.id===card.id)
      assert.deepEqual(model.capabilities.refineResolutions,descriptor?.values || [])
      await assert.rejects(legacy.callImageModel('openrouter',card.id,'fixture-only','edit','16:9',`data:image/png;base64,${onePixelPngBase64}`,'auto',true),/no longer declares requested refinement resolution/)
      assert.equal(bodies.length,0)
      if(descriptor?.values?.length) {
        await legacy.callImageModel('openrouter',card.id,'fixture-only','edit','16:9',`data:image/png;base64,${onePixelPngBase64}`,'2K',true)
        assert.equal(bodies[0].resolution,'2K')
      }
    } finally { legacy.configureRuntimeFetch() }
  }
})

test('OpenRouter image default stays recommended while exact paid-verified profiles are also selectable', async () => {
  const legacy = await loadLegacy()
  const textModels = [
    { id: 'openai/gpt-5.5', name: 'GPT-5.5', architecture: { input_modalities: ['text', 'image'], output_modalities: ['text'] } },
    { id: 'google/gemini-3.6-flash', name: 'Gemini 3.6 Flash', architecture: { input_modalities: ['text', 'image'], output_modalities: ['text'] } },
  ]
  const imageModels = [
    {
      id: 'openai/gpt-image-2', name: 'GPT Image 2',
      architecture: { input_modalities: ['text', 'image'], output_modalities: ['image'] },
      supported_parameters: { input_references: { max: 4 } },
    },
    {
      id: 'openai/gpt-5.4-image-2', name: 'GPT-5.4 Image 2',
      architecture: { input_modalities: ['text', 'image'], output_modalities: ['image'] },
      supported_parameters: { resolution: { values: ['2K'] } },
    },
    {
      id: 'google/gemini-3.1-flash-image', name: 'Gemini 3.1 Flash Image',
      architecture: { input_modalities: ['text', 'image'], output_modalities: ['image'] },
      supported_parameters: {},
    },
    {
      id: 'sourceful/jpeg-only', name: 'JPEG Only',
      architecture: { input_modalities: ['text'], output_modalities: ['image'] },
      supported_parameters: { output_format: { values: ['jpeg'] } },
    },
    {
      id: 'sourceful/riverflow-v2.5-pro', name: 'Riverflow 2.5 Pro',
      architecture: { input_modalities: ['text', 'image'], output_modalities: ['image'] },
      supported_parameters: { output_format: { values: ['png', 'jpeg'] }, input_references: { max: 1 } },
    },
  ]
  legacy.configureRuntimeFetch(async (input) => {
    const url = String(input)
    if (url.endsWith('/api/v1/models')) return Response.json({ data: textModels })
    if (url.endsWith('/images/models')) return Response.json({ data: imageModels })
    throw new Error(`unexpected request: ${url}`)
  })
  try {
    const context = (body: Record<string, any>) => ({
      request: { method: 'POST' }, body, headers: {}, response: { setHeader() {}, status() {} },
    })
    const result = await legacy.default(context({ action: 'modelRegistry', provider: 'openrouter' }))
    const models = new Map<string, any>(result.providers.openrouter.models.map((entry: any) => [entry.id, entry]))
    const imageDefault = result.providers.openrouter.defaults.image
    assert.equal(imageDefault, 'sourceful/riverflow-v2.5-pro')
    assert.equal(models.get(imageDefault)?.roles.includes('image'), true)
    assert.equal(models.get(imageDefault)?.selectable, true)
    assert.equal(models.get(imageDefault)?.recommended, true)
    for (const id of ['openai/gpt-image-2', 'openai/gpt-5.4-image-2', 'google/gemini-3.1-flash-image']) {
      assert.equal(models.get(id)?.selectable, true, id)
      assert.equal(models.get(id)?.roles.includes('image'), true, id)
      assert.equal(models.get(id)?.recommended, false, id)
    }
    assert.equal(models.get('sourceful/jpeg-only'), undefined)

    const rejected = await legacy.default(context({
      action: 'createJob', provider: 'openrouter', apiKeys: { openrouter: 'key' },
      methodContent: 'A sufficiently detailed method section for rejecting an incompatible image model.',
      caption: 'A valid caption.', mainModelName: 'openai/gpt-5.5', imageModelName: 'sourceful/jpeg-only',
    }))
    assert.equal(rejected.code, 400)
    assert.match(rejected.error, /not registered for image/)
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
    await legacy.callImageModel('bailian', 'qwen-image-2.0-pro', 'key', 'diagram', '16:9', '', '4K')
    await legacy.callImageModel('bailian', 'z-image-turbo', 'key', 'diagram', '16:9', '', '4K')
  } finally {
    legacy.configureRuntimeFetch()
  }

  assert.equal(payloads[0].parameters.size, '5456*3069')
  assert.equal(payloads[0].parameters.thinking_mode, true)
  assert.equal(Object.hasOwn(payloads[0].parameters, 'prompt_extend'), false)
  assert.equal(payloads[1].parameters.size, '2720*1530')
  assert.equal(payloads[1].parameters.prompt_extend, true)
  assert.equal(Object.hasOwn(payloads[1].parameters, 'thinking_mode'), false)
  assert.equal(payloads[1].model, 'qwen-image-2.0-pro')
  assert.equal(payloads[2].parameters.size, '2720*1530')
  assert.equal(Object.hasOwn(payloads[2].parameters, 'prompt_extend'), false)
  assert.equal(Object.hasOwn(payloads[2].parameters, 'thinking_mode'), false)
})

test('Bailian direct-edit models forward source pixels as an image input', async () => {
  const legacy = await loadLegacy()
  const testState = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  const previousWriteMode = testState.ossWriteMode
  let generationPayload: any
  testState.ossWriteMode = 'race'
  legacy.configureRuntimeFetch(async (input, init) => {
    const url = String(input)
    if (url === 'https://images.invalid/source.png') {
      return new Response('source-bytes', { headers: { 'Content-Type': 'image/png' } })
    }
    if (url.includes('/multimodal-generation/generation')) {
      generationPayload = JSON.parse(String(init?.body || '{}'))
      return Response.json({ output: { choices: [{ message: { content: [{ image: 'https://images.invalid/result.png' }] } }] } })
    }
    if (url === 'https://images.invalid/result.png') {
      return new Response('result-bytes', { headers: { 'Content-Type': 'image/png' } })
    }
    throw new Error(`unexpected request: ${url}`)
  })
  try {
    await legacy.callImageModel(
      'bailian', 'qwen-image-2.0-pro', 'key', 'Make labels clearer', '16:9',
      'https://images.invalid/source.png', '4K',
    )
  } finally {
    legacy.configureRuntimeFetch()
    testState.ossWriteMode = previousWriteMode
    testState.deletedOwnerKeys = []
  }
  assert.deepEqual(generationPayload.input.messages[0].content, [
    { image: 'https://images.invalid/source.png' },
    { text: 'Make labels clearer' },
  ])
  assert.equal(generationPayload.parameters.size, '2720*1530')
})

test('refine prefers owned object bytes over a preview URL when both source fields are present', async () => {
  const legacy = await loadLegacy()
  const testState = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  const previousWriteMode = testState.ossWriteMode
  const previousStoredObjects = testState.storedObjectBytes
  let previewUrlFetched = false
  let interactionPayload: any
  testState.ossWriteMode = 'race'
  testState.deletedOwnerKeys = []
  testState.storedObjectBytes = { 'owned/source.png': 'owned-object-bytes' }
  const insertCount = testState.inserts.length
  legacy.configureRuntimeFetch(async (input, init) => {
    const url = String(input)
    if (url === 'https://signed.invalid/expired-preview.png') {
      previewUrlFetched = true
      return new Response('preview-url-bytes', { headers: { 'Content-Type': 'image/png' } })
    }
    if (url.endsWith('/v1beta/interactions')) {
      interactionPayload = JSON.parse(String(init?.body || '{}'))
      return Response.json({ output_image: { data: 'cmVmaW5lZA==', mime_type: 'image/png' } })
    }
    throw new Error(`unexpected request: ${url}`)
  })
  try {
    const queued = await legacy.default({
      request: { method: 'POST' },
      body: {
        action: 'refineImage',
        clientPlatform: 'ios',
        provider: 'gemini',
        apiKeys: { gemini: 'selected-key' },
        userId: 'owner-1',
        mainModelName: 'gemini-3.6-flash',
        imageModelName: 'gemini-3.1-flash-image',
        sourceImageUrl: 'https://signed.invalid/expired-preview.png',
        sourceImageObjectKey: 'owned/source.png',
        editInstruction: 'Make the labels clearer.',
      },
      headers: { 'x-real-ip': '203.0.113.20' },
      response: { setHeader() {}, status() {} },
    })
    assert.equal(queued.code, 0)
    assert.equal(testState.inserts[insertCount].clientPlatform, 'ios')
    await legacy.drainJobAdmission()
  } finally {
    legacy.configureRuntimeFetch()
    testState.ossWriteMode = previousWriteMode
    testState.storedObjectBytes = previousStoredObjects
    testState.deletedOwnerKeys = []
  }
  assert.equal(previewUrlFetched, false)
  assert.equal(
    interactionPayload.input.find((item: any) => item.type === 'image')?.data,
    Buffer.from('owned-object-bytes').toString('base64'),
  )
})

test('owned refine outputs use the 20MiB provider-image cap instead of the 5MiB reference-upload cap', async () => {
  const legacy = await loadLegacy()
  const testState = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  const previousWriteMode = testState.ossWriteMode
  const previousStoredObjects = testState.storedObjectBytes
  const previousReadFileLimits = testState.readFileLimits
  let interactionCalls = 0
  testState.ossWriteMode = 'race'
  testState.readFileLimits = []
  legacy.configureRuntimeFetch(async (input) => {
    assert.match(String(input), /\/v1beta\/interactions$/)
    interactionCalls += 1
    return Response.json({ output_image: { data: 'cmVmaW5lZA==', mime_type: 'image/png' } })
  })

  const invoke = async (objectKey: string, bytes: Buffer) => {
    testState.deletedOwnerKeys = []
    testState.storedObjectBytes = { [objectKey]: bytes }
    const queued = await legacy.default({
      request: { method: 'POST' },
      body: {
        action: 'refineImage',
        provider: 'gemini',
        apiKeys: { gemini: 'selected-key' },
        userId: 'owner-1',
        mainModelName: 'gemini-3.6-flash',
        imageModelName: 'gemini-3.1-flash-image',
        sourceImageObjectKey: objectKey,
        editInstruction: 'Make the labels clearer.',
      },
      headers: { 'x-real-ip': '203.0.113.21' },
      response: { setHeader() {}, status() {} },
    })
    assert.equal(queued.code, 0)
    await legacy.drainJobAdmission()
  }

  try {
    await invoke('owned/large-source.png', Buffer.alloc(5 * 1024 * 1024 + 1, 1))
    assert.equal(interactionCalls, 1, 'a stored generated output above 5MiB should reach the image model')
    await invoke('owned/oversized-source.png', Buffer.alloc(20 * 1024 * 1024 + 1, 1))
    assert.equal(interactionCalls, 1, 'a stored generated output above 20MiB must fail before provider dispatch')
    assert.deepEqual(testState.readFileLimits, [20 * 1024 * 1024, 20 * 1024 * 1024])
  } finally {
    legacy.configureRuntimeFetch()
    testState.ossWriteMode = previousWriteMode
    testState.storedObjectBytes = previousStoredObjects
    testState.readFileLimits = previousReadFileLimits
    testState.deletedOwnerKeys = []
  }
})

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const legacyPath = path.resolve(packageRoot, '../laf-functions/paperbanana-api.ts')
const legacyBridgePath = path.resolve(packageRoot, 'src/legacy-entry.mjs')

let legacyPromise: Promise<LegacyPolicyModule> | undefined

async function loadLegacy(): Promise<LegacyPolicyModule> {
  if (!legacyPromise) {
    legacyPromise = (async () => {
      ;(globalThis as any).__paperbananaLegacySharp = sharp
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
            builder.onResolve({ filter: /^sharp$/ }, () => ({ path: 'sharp', namespace: 'sharp-test' }))
            builder.onLoad({ filter: /.*/, namespace: 'sharp-test' }, () => ({
              loader: 'js',
              contents: 'export default globalThis.__paperbananaLegacySharp;',
            }))
            builder.onResolve({ filter: /^@lafjs\/cloud$/ }, () => ({ path: 'fake-laf-cloud', namespace: 'fake' }))
            builder.onLoad({ filter: /.*/, namespace: 'fake' }, () => ({
              loader: 'js',
              contents: `
                const state = globalThis.__paperbananaLegacyTestState ||= { inserts: [], jobRows: [], deletedOwnerKeys: [], accountDeletionFindQueries: [], deletedObjects: [], storedObjectBytes: {}, readFileLimits: [], ossWriteMode: 'fail', ossWrites: [], referenceRows: [], referenceFindQueries: [], signedReferenceKeys: [], signingFailures: [] };
                const matches = (row, query = {}) => Object.entries(query).every(([field, expected]) => {
                  const actual = row[field];
                  if (expected && typeof expected === 'object' && '$in' in expected) return expected.$in.includes(actual);
                  return actual === expected;
                });
                const collectionFor = (name) => ({
                  find(query = {}) {
                    if (name === 'paperbanana_jobs') {
                      let rows = [...(state.jobRows || [])];
                      return { sort() { return this }, skip() { return this }, limit(value) { rows = rows.slice(0, Number(value || 0)); return this }, async toArray() { return rows.map((row) => ({ ...row })) } };
                    }
                    if (name !== 'paperbanana_references') return { sort() { return this }, skip() { return this }, limit() { return this }, async toArray() { return [] } };
                    state.referenceFindQueries.push(structuredClone(query));
                    let rows = (state.referenceRows || []).filter((row) => matches(row, query));
                    let offset = 0;
                    let count = Number.MAX_SAFE_INTEGER;
                    return {
                      sort(spec = {}) {
                        const entries = Object.entries(spec);
                        rows = [...rows].sort((left, right) => {
                          for (const [field, direction] of entries) {
                            const compared = String(left[field] ?? '').localeCompare(String(right[field] ?? ''), 'en', { numeric: true });
                            if (compared) return compared * Number(direction || 1);
                          }
                          return 0;
                        });
                        return this;
                      },
                      skip(value) { offset = Number(value || 0); return this },
                      limit(value) { count = Number(value || 0); return this },
                      async toArray() { return rows.slice(offset, offset + count).map((row) => ({ ...row })) },
                    };
                  },
                  async findOne(query) {
                    if (name === 'paperbanana_jobs') {
                      const configured = [...(state.jobRows || []), ...(state.inserts || [])].find((row) => row._id === query?._id);
                      if (configured) return { ...configured };
                      if (query?._id === 'job-1') return { _id: 'job-1', userId: 'owner-1' };
                    }
                    if (name === 'paperbanana_account_deletions') {
                      const keys = query?._id?.$in || [];
                      (state.accountDeletionFindQueries ||= []).push(structuredClone(query));
                      return keys.some((key) => state.deletedOwnerKeys.includes(key)) ? { _id: keys[0] } : null;
                    }
                    return null;
                  },
                  async insertOne(document) { state.inserts.push(document) },
                  async updateOne(query, update) { (state.updates ||= []).push({ name, query: structuredClone(query), update: structuredClone(update) }) }, async deleteMany() { return { deletedCount: 0 } }
                });
                const bucket = {
                  async readFile(key, maxBytes) {
                    (state.readFileLimits ||= []).push(maxBytes);
                    const value = state.storedObjectBytes?.[key];
                    if (value === undefined) throw new Error('stored object not found');
                    const bytes = Buffer.from(value);
                    if (bytes.length > maxBytes) throw new Error('stored object exceeds limit');
                    return bytes;
                  },
                  async writeFile(key, _content, metadata) {
                    if (state.ossWriteMode === 'race') {
                      state.deletedOwnerKeys = ['user:owner-1'];
                      return;
                    }
                    if (state.ossWriteMode === 'success') {
                      (state.ossWrites ||= []).push({ key, metadata: structuredClone(metadata) });
                      return;
                    }
                    throw new Error('OSS write failed');
                  },
                  async getDownloadUrl(key) {
                    if (String(key).startsWith('references/bench/')) state.signedReferenceKeys.push(key);
                    if ((state.signingFailures || []).includes(key)) throw new Error('signing failed');
                    return 'https://signed.invalid/object';
                  },
                  async getUploadUrl() { return 'https://signed.invalid/upload' },
                  async listFiles() { return { Contents: [], IsTruncated: false } },
                  async deleteFile(key) { state.deletedObjects.push(key) }
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

test('public task detail and admin/user lists expose both normalized platform aliases without guessing history', async () => {
  const legacy = await loadLegacy()
  const state = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  const previousGateway = process.env.PAPERBANANA_GATEWAY_TOKEN
  const previousAdmin = process.env.ADMIN_TOKEN
  state.jobRows = [
    { _id: 'job-camel', status: 'succeeded', userId: 'user-1', clientPlatform: 'windows', resultImages: [], stages: [] },
    { _id: 'job-snake', status: 'succeeded', userId: 'user-1', client_platform: 'harmony', resultImages: [], stages: [] },
    { _id: 'job-legacy', status: 'succeeded', userId: 'user-1', resultImages: [], stages: [] },
    { _id: 'job-invalid', status: 'succeeded', userId: 'user-1', clientPlatform: 'mobile', resultImages: [], stages: [] },
    { _id: 'job-alias-fallback', status: 'succeeded', userId: 'user-1', clientPlatform: 'mobile', client_platform: 'harmony', resultImages: [], stages: [] },
    { _id: 'job-canonical-wins', status: 'succeeded', userId: 'user-1', clientPlatform: 'windows', client_platform: 'ios', resultImages: [], stages: [] },
  ]
  process.env.PAPERBANANA_GATEWAY_TOKEN = 'test-gateway'
  process.env.ADMIN_TOKEN = 'test-admin'
  const invoke = (body: Record<string, unknown>) => legacy.default({
    request: { method: 'POST' }, body, headers: { 'user-agent': 'Mobile client that must never be inferred' }, response: { setHeader() {}, status() {} },
  })

  try {
    const detail = await invoke({ action: 'getJob', jobId: 'job-camel', gatewayToken: 'test-gateway' })
    const user = await invoke({ action: 'userJobs', userId: 'user-1', gatewayToken: 'test-gateway' })
    const admin = await invoke({ action: 'adminJobs', adminToken: 'test-admin' })

    assert.equal(detail.job.id, 'job-camel', JSON.stringify(detail))
    assert.deepEqual(
      { clientPlatform: detail.job.clientPlatform, client_platform: detail.job.client_platform },
      { clientPlatform: 'windows', client_platform: 'windows' },
    )
    for (const response of [user, admin]) {
      assert.deepEqual(
        response.jobs.map((job: any) => [job.id, job.clientPlatform, job.client_platform]),
        [
          ['job-camel', 'windows', 'windows'],
          ['job-snake', 'harmony', 'harmony'],
          ['job-legacy', '', ''],
          ['job-invalid', '', ''],
          ['job-alias-fallback', 'harmony', 'harmony'],
          ['job-canonical-wins', 'windows', 'windows'],
        ],
      )
    }
  } finally {
    state.jobRows = []
    if (previousGateway === undefined) delete process.env.PAPERBANANA_GATEWAY_TOKEN
    else process.env.PAPERBANANA_GATEWAY_TOKEN = previousGateway
    if (previousAdmin === undefined) delete process.env.ADMIN_TOKEN
    else process.env.ADMIN_TOKEN = previousAdmin
  }
})

test('public task views expose negativePrompt alongside methodContent and caption', async () => {
  const legacy = await loadLegacy()
  const state = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  const previousRows = state.jobRows
  const previousGateway = process.env.PAPERBANANA_GATEWAY_TOKEN
  const previousAdmin = process.env.ADMIN_TOKEN
  state.jobRows = [{
    _id: 'negative-public', status: 'succeeded', userId: 'user-negative',
    methodContent: 'Stored method.', caption: 'Stored caption.', negativePrompt: 'Avoid gradients.',
    resultImages: [], stages: [],
  }]
  process.env.PAPERBANANA_GATEWAY_TOKEN = 'negative-gateway'
  process.env.ADMIN_TOKEN = 'negative-admin'
  const invoke = (body: Record<string, unknown>) => legacy.default({
    request: { method: 'POST' }, body, headers: {}, response: { setHeader() {}, status() {} },
  })
  try {
    const detail = await invoke({ action: 'getJob', jobId: 'negative-public', gatewayToken: 'negative-gateway' })
    const user = await invoke({ action: 'userJobs', userId: 'user-negative', gatewayToken: 'negative-gateway' })
    const admin = await invoke({ action: 'adminJobs', adminToken: 'negative-admin' })
    for (const job of [detail.job, user.jobs[0], admin.jobs[0]]) {
      assert.equal(job.methodContent, 'Stored method.')
      assert.equal(job.caption, 'Stored caption.')
      assert.equal(job.negativePrompt, 'Avoid gradients.')
    }
  } finally {
    state.jobRows = previousRows
    if (previousGateway === undefined) delete process.env.PAPERBANANA_GATEWAY_TOKEN
    else process.env.PAPERBANANA_GATEWAY_TOKEN = previousGateway
    if (previousAdmin === undefined) delete process.env.ADMIN_TOKEN
    else process.env.ADMIN_TOKEN = previousAdmin
  }
})

test('Harmony feedback is accepted while unknown feedback platforms remain rejected', async () => {
  const legacy = await loadLegacy()
  const state = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  const previousGateway = process.env.PAPERBANANA_GATEWAY_TOKEN
  process.env.PAPERBANANA_GATEWAY_TOKEN = 'test-gateway'
  state.inserts.length = 0
  const invoke = (platform: string) => legacy.default({
    request: { method: 'POST' },
    body: { action: 'submitFeedback', message: 'Harmony feedback contract', platform, gatewayToken: 'test-gateway' },
    headers: { 'x-real-ip': '203.0.113.30' },
    response: { setHeader() {}, status() {} },
  })
  try {
    const accepted = await invoke('harmony')
    assert.equal(accepted.code, 0)
    assert.equal(state.inserts.at(-1).platform, 'harmony')
    const insertCount = state.inserts.length
    const rejected = await invoke('mobile')
    assert.deepEqual(rejected, { code: 400, error: 'platform is required' })
    assert.equal(state.inserts.length, insertCount)
  } finally {
    state.inserts.length = 0
    if (previousGateway === undefined) delete process.env.PAPERBANANA_GATEWAY_TOKEN
    else process.env.PAPERBANANA_GATEWAY_TOKEN = previousGateway
  }
})

test('invalid task platform is rejected without persistence and missing history is not backfilled', async () => {
  const legacy = await loadLegacy()
  const state = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  const insertCount = state.inserts.length
  for (const action of ['createJob', 'refineImage']) {
    const result = await legacy.default({
      request: { method: 'POST' },
      body: { action, clientPlatform: 'desktop' },
      headers: { 'user-agent': 'Desktop UA must not become a platform' },
      response: { setHeader() {}, status() {} },
    })
    assert.deepEqual(result, { code: 400, error: 'Invalid clientPlatform' })
  }
  assert.equal(state.inserts.length, insertCount)
})

test('create background execution DTO omits the complete apiKeys map', async () => {
  const legacy = await loadLegacy()
  assert.equal(typeof legacy.toCreateExecutionBody, 'function')

  const result = legacy.toCreateExecutionBody({
    action: 'createJob',
    provider: 'gemini',
    apiKeys: { gemini: 'selected', openai: 'must-not-survive', bailian: 'must-not-survive' },
    routeSecrets: { gemini: 'must-not-survive-either' },
    gatewayToken: 'gateway-secret',
    adminToken: 'admin-secret',
    apiKey: 'single-secret',
    caption: 'caption',
    negativePrompt: 'Avoid gradients.',
    negative_prompt: 'caller alias must not bypass normalization',
  })

  assert.equal(Object.hasOwn(result, 'apiKeys'), false)
  assert.deepEqual(result, {
    action: 'createJob', provider: 'gemini', caption: 'caption', negativePrompt: 'Avoid gradients.',
  })
})

test('createJob trims and persists negativePrompt separately and counts it without changing methodContent', async () => {
  const legacy = await loadLegacy()
  const state = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  const previousInserts = state.inserts
  state.inserts = []
  legacy.configureRuntimeFetch(async () => new Response('provider failed', { status: 400 }))
  const methodContent = 'A sufficiently detailed methodology that must remain byte-for-byte unchanged.'
  try {
    const queued = await legacy.default({
      request: { method: 'POST' },
      body: {
        action: 'createJob', provider: 'openai', apiKeys: { openai: 'key' },
        methodContent, caption: 'Negative prompt persistence.', negative_prompt: '  Avoid gradients and shadows.  ',
        outputFormat: 'svg', retrievalSetting: 'none', maxCriticRounds: 0,
        mainModelName: 'gpt-5.6-sol', imageModelName: 'gpt-image-2',
      },
      headers: {}, response: { setHeader() {}, status() {} },
    })
    assert.equal(queued.code, 0, JSON.stringify(queued))
    assert.equal(state.inserts.length, 1)
    assert.equal(state.inserts[0].methodContent, methodContent)
    assert.equal(state.inserts[0].negativePrompt, 'Avoid gradients and shadows.')
    assert.equal(
      state.inserts[0].promptCharCount,
      methodContent.length + 'Negative prompt persistence.'.length + 'Avoid gradients and shadows.'.length,
    )
    await legacy.drainJobAdmission()
  } finally {
    legacy.configureRuntimeFetch()
    state.inserts = previousInserts
  }
})

test('createJob rejects malformed and oversized negativePrompt before persistence', async () => {
  const legacy = await loadLegacy()
  const state = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  const insertCount = state.inserts.length
  const base = {
    action: 'createJob', provider: 'openai', apiKeys: { openai: 'key' },
    methodContent: 'A sufficiently detailed methodology for validating negative prompt limits.',
    caption: 'Negative prompt validation.', outputFormat: 'svg', retrievalSetting: 'none', maxCriticRounds: 0,
    mainModelName: 'gpt-5.6-sol', imageModelName: 'gpt-image-2',
  }
  for (const negativePrompt of [42, 'x'.repeat(1001)]) {
    const result = await legacy.default({
      request: { method: 'POST' }, body: { ...base, negativePrompt }, headers: {},
      response: { setHeader() {}, status() {} },
    })
    assert.equal(result.code, 400)
    assert.match(result.error, /negativePrompt/)
  }
  assert.equal(state.inserts.length, insertCount)
})

test('create generation prompts use a separate avoidance block across PNG, critic, SVG, and plot paths', async () => {
  const legacy = await loadLegacy()
  const negativePrompt = '  Avoid gradients and decorative shadows.  '
  const delimited = legacy.withNegativePrompt('Base prompt.', negativePrompt)
  assert.equal(delimited, [
    'Base prompt.',
    '',
    '<avoidance_constraints>',
    'Avoid gradients and decorative shadows.',
    '</avoidance_constraints>',
  ].join('\n'))
  assert.equal(legacy.withNegativePrompt('Base prompt.', '   '), 'Base prompt.')

  const source = fs.readFileSync(legacyPath, 'utf8')
  assert.match(source, /diagramPrompt\(body\.methodContent, body\.caption, referenceAnalysis, retrievalContext, body\.negativePrompt\)/)
  assert.ok(
    (source.match(/diagramPromptFromDescription\(description, body\.negativePrompt\)/g) || []).length >= 2,
    'initial PNG and critic-driven re-render must both carry negativePrompt',
  )
  assert.match(source, /callSvgModel\([^\n]+withNegativePrompt\(description, body\.negativePrompt\), renderRoute\.region\)/)
  assert.match(source, /plannerUserPrompt\([^\n]+body\.negativePrompt\)/)
  assert.match(source, /imageCriticUserPrompt\([^\n]+body\.negativePrompt\)/)
  assert.match(source, /plotPlannerUserPrompt\([^\n]+body\.negativePrompt\)/)
  assert.match(source, /plotCriticUserPrompt\([^\n]+body\.negativePrompt\)/)
  assert.match(source, /plotVisualizerUserPrompt\(description, body\.negativePrompt\)/)
})

test('refine background execution DTO omits the complete apiKeys map', async () => {
  const legacy = await loadLegacy()
  assert.equal(typeof legacy.toRefineExecutionBody, 'function')

  const result = legacy.toRefineExecutionBody({
    action: 'refineImage',
    provider: 'openai',
    apiKeys: { openai: 'selected', gemini: 'must-not-survive' },
    routeSecrets: { openai: 'must-not-survive-either' },
    gatewayToken: 'gateway-secret',
    adminToken: 'admin-secret',
    apiKey: 'single-secret',
    editInstruction: 'make labels clearer',
  })

  assert.equal(Object.hasOwn(result, 'apiKeys'), false)
  assert.deepEqual(result, { action: 'refineImage', provider: 'openai', editInstruction: 'make labels clearer' })
})

test('public jobs expose stored routes and derive only complete legacy routing history', async () => {
  const legacy = await loadLegacy()
  const state = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  const previousGateway = process.env.PAPERBANANA_GATEWAY_TOKEN
  state.jobRows = [
    {
      _id: 'stored-routes', status: 'succeeded', provider: 'mixed', userId: 'owner-1',
      mainModelName: 'gpt-5.6-sol', imageModelName: 'gemini-3.1-flash-image', referenceVisionModelName: 'qwen3.7-plus',
      modelRoutes: {
        main: { accessProvider: 'openai', modelId: 'gpt-5.6-sol' },
        image: { accessProvider: 'gemini', modelId: 'gemini-3.1-flash-image' },
        vision: { accessProvider: 'bailian', modelId: 'qwen3.7-plus' },
      },
      routingMode: 'mixed', modelRoutingVersion: 1, modelRoutingSource: 'explicit', resultImages: [], stages: [],
      apiKeys: { openai: 'stored-secret-must-not-leak' }, routeSecrets: { openai: 'stored-route-secret-must-not-leak' },
    },
    {
      _id: 'complete-legacy-routes', status: 'succeeded', provider: 'openai', userId: 'owner-1',
      mainModelName: 'gpt-5.6-sol', imageModelName: 'gpt-image-2', resultImages: [], stages: [],
    },
    {
      _id: 'incomplete-legacy-routes', status: 'succeeded', provider: 'openai', userId: 'owner-1',
      mainModelName: 'gpt-5.6-sol', resultImages: [], stages: [],
    },
  ]
  process.env.PAPERBANANA_GATEWAY_TOKEN = 'test-gateway'
  const invoke = (jobId: string) => legacy.default({
    request: { method: 'POST' },
    body: { action: 'getJob', jobId, gatewayToken: 'test-gateway' },
    headers: {},
    response: { setHeader() {}, status() {} },
  })
  try {
    const stored = (await invoke('stored-routes')).job
    assert.equal(stored.provider, 'openai')
    assert.equal(stored.routingMode, 'mixed')
    assert.equal(stored.modelRoutingVersion, 1)
    assert.equal(stored.modelRoutingSource, 'explicit')
    assert.deepEqual(stored.modelRoutes, state.jobRows[0].modelRoutes)
    assert.doesNotMatch(JSON.stringify(stored), /stored-secret|routeSecrets|apiKeys/)

    const complete = (await invoke('complete-legacy-routes')).job
    assert.deepEqual(complete.modelRoutes, {
      main: { accessProvider: 'openai', modelId: 'gpt-5.6-sol' },
      image: { accessProvider: 'openai', modelId: 'gpt-image-2' },
      vision: { accessProvider: 'openai', modelId: 'gpt-5.6-sol' },
    })
    assert.equal(complete.routingMode, 'single')
    assert.equal(complete.modelRoutingVersion, 1)
    assert.equal(complete.modelRoutingSource, 'legacy-derived')

    const incomplete = (await invoke('incomplete-legacy-routes')).job
    assert.equal(Object.hasOwn(incomplete, 'modelRoutes'), false)
    assert.equal(Object.hasOwn(incomplete, 'routingMode'), false)
    assert.equal(Object.hasOwn(incomplete, 'modelRoutingVersion'), false)
    assert.equal(Object.hasOwn(incomplete, 'modelRoutingSource'), false)
  } finally {
    state.jobRows = []
    if (previousGateway === undefined) delete process.env.PAPERBANANA_GATEWAY_TOKEN
    else process.env.PAPERBANANA_GATEWAY_TOKEN = previousGateway
  }
})

test('persisted and public job errors and logs redact credential-bearing text', async () => {
  const legacy = await loadLegacy()
  const state = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  const previousGateway = process.env.PAPERBANANA_GATEWAY_TOKEN
  const previousInserts = state.inserts
  const previousUpdates = state.updates
  state.inserts = []
  state.updates = []
  state.jobRows = [{
    _id: 'secret-history', status: 'failed', provider: 'openai', userId: 'owner-1',
    mainModelName: 'gpt-5.6-sol', imageModelName: 'gpt-image-2', resultImages: [],
    error: 'request failed at https://provider.invalid/run?key=history-query-secret',
    logs: [
      'Authorization: Bearer history-bearer-secret',
      { api_keys: ['history-array-secret'], nested: { apiKeys: 'history-string-secret' }, safe: 'visible' },
    ],
    stages: [{
      error: 'Bearer history-stage-secret', title: 'failed stage',
      image: { storageError: 'x-goog-api-key: history-nested-secret' },
    }],
  }]
  process.env.PAPERBANANA_GATEWAY_TOKEN = 'test-gateway'
  legacy.configureRuntimeFetch(async () => Response.json({
    error: {
      message: 'provider rejected https://provider.invalid/run?key=persisted-query-secret Authorization: Bearer persisted-bearer-secret api_key: persisted-colon-secret x-goog-api-key: persisted-google-secret raw=request-secret',
    },
  }, { status: 400 }))
  try {
    const detail = await legacy.default({
      request: { method: 'POST' },
      body: { action: 'getJob', jobId: 'secret-history', gatewayToken: 'test-gateway' },
      headers: {}, response: { setHeader() {}, status() {} },
    })
    const publicText = JSON.stringify(detail)
    assert.doesNotMatch(publicText, /history-query-secret|history-bearer-secret|history-stage-secret|history-nested-secret|history-array-secret|history-string-secret/)
    assert.match(publicText, /visible/)
    assert.match(publicText, /REDACTED/)

    const queued = await legacy.default({
      request: { method: 'POST' },
      body: {
        action: 'createJob', provider: 'openai', gatewayToken: 'test-gateway', apiKeys: { openai: 'request-secret' },
        methodContent: 'A sufficiently detailed method for persisted error redaction verification.',
        caption: 'Persisted error redaction.', outputFormat: 'svg', retrievalSetting: 'none',
        mainModelName: 'gpt-5.6-sol', imageModelName: 'gpt-image-2', referenceVisionModelName: 'gpt-5.6-sol',
      },
      headers: {}, response: { setHeader() {}, status() {} },
    })
    assert.equal(queued.code, 0, JSON.stringify(queued))
    await legacy.drainJobAdmission()
    const persistedText = JSON.stringify(state.updates)
    assert.doesNotMatch(persistedText, /persisted-query-secret|persisted-bearer-secret|persisted-colon-secret|persisted-google-secret|request-secret/)
    assert.match(persistedText, /REDACTED/)
    const terminalUpdate = state.updates.findLast((entry: any) => entry.update?.$set?.status === 'failed')
    assert.equal(terminalUpdate.update.$set.error, 'Model execution failed. Please retry.')
  } finally {
    legacy.configureRuntimeFetch()
    state.jobRows = []
    state.inserts = previousInserts
    state.updates = previousUpdates
    if (previousGateway === undefined) delete process.env.PAPERBANANA_GATEWAY_TOKEN
    else process.env.PAPERBANANA_GATEWAY_TOKEN = previousGateway
  }
})

test('request handlers delegate background closures with secret-free DTOs', () => {
  const source = fs.readFileSync(legacyPath, 'utf8')
  assert.match(source, /startCreateJobInBackground\(reservation, jobId, jobBody, routeSecrets, safeNumCandidates, safeCriticRounds\)/)
  assert.match(source, /startRefineJobInBackground\(reservation, jobId, normalizedBody, routeSecrets\)/)
  const createStart = source.indexOf('async function createJob')
  const refineStart = source.indexOf('async function refineImage')
  const createSection = source.slice(createStart, refineStart)
  const refineSection = source.slice(refineStart, source.indexOf('async function getJob'))
  assert.ok(createSection.includes('await verifyUploadedReferenceObjects('))
  assert.ok(createSection.indexOf('await resolveReferenceImageMode(') < createSection.indexOf('jobAdmission.reserve('))
  assert.ok(createSection.indexOf('await validateModelRouting(') < createSection.indexOf('jobAdmission.reserve('))
  assert.ok(createSection.indexOf('jobAdmission.reserve(') < createSection.indexOf('await jobs.insertOne('))
  assert.ok(createSection.indexOf('jobAdmission.reserve(') < createSection.indexOf('await verifyUploadedReferenceObjects('))
  assert.ok(createSection.indexOf('await verifyUploadedReferenceObjects(') < createSection.indexOf('await jobs.insertOne('))
  assert.ok(refineSection.lastIndexOf('await validateModelRouting(') < refineSection.indexOf('jobAdmission.reserve('))
  assert.ok(refineSection.indexOf('jobAdmission.reserve(') < refineSection.indexOf('await jobs.insertOne('))
})

test('result and stage writes delete objects when account deletion starts during OSS write', async () => {
  const legacy = await loadLegacy()
  const testState = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  testState.ossWriteMode = 'race'
  testState.deletedOwnerKeys = []
  testState.deletedObjects = []
  try {
    await assert.rejects(
      legacy.saveResult('job-1', 0, 'cG5n', 'image/png', 'base64'),
      /Account deletion is in progress/,
    )
    testState.deletedOwnerKeys = []
    await assert.rejects(
      legacy.saveStageImage('job-1', 0, 'render-0', 'cG5n', 'image/png', 'base64'),
      /Account deletion is in progress/,
    )
    assert.deepEqual(testState.deletedObjects, [
      'job-1/candidate-0.png',
      'job-1/candidate-0-render-0.png',
    ])
  } finally {
    testState.ossWriteMode = 'fail'
    testState.deletedOwnerKeys = []
    testState.deletedObjects = []
  }
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
      clientPlatform: 'android',
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
    assert.equal(testState.inserts[0].clientPlatform, 'android')

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

test('Ark-normalized PNG bytes retain PNG content type and extension through result and stage persistence', async () => {
  const legacy = await loadLegacy()
  const state = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  const previous = process.env.PAPERBANANA_STRICT_OBJECT_STORAGE
  const previousWriteMode = state.ossWriteMode
  const previousWrites = state.ossWrites
  const jpegBase64 = fs.readFileSync(path.resolve(packageRoot, '../web/public/logo.jpg')).toString('base64')
  delete process.env.PAPERBANANA_STRICT_OBJECT_STORAGE
  try {
    legacy.configureRuntimeFetch(async () => Response.json({ data: [{ b64_json: jpegBase64 }] }))
    const pngBase64 = await legacy.callImageModel('ark', 'doubao-seedream-4-0-250828', 'key', 'diagram', '16:9')
    assert.equal(Buffer.from(pngBase64, 'base64').subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
    state.ossWriteMode = 'success'
    state.ossWrites = []
    const persisted = await legacy.saveResult('job-1', 1, pngBase64, 'image/png', 'base64')
    const persistedStage = await legacy.saveStageImage('job-1', 1, 'ark-render', pngBase64, 'image/png', 'base64')
    assert.equal(persisted.objectKey, 'job-1/candidate-1.png')
    assert.equal(persistedStage.filename, 'job-1/candidate-1-ark-render.png')
    assert.deepEqual(state.ossWrites, [
      { key: 'job-1/candidate-1.png', metadata: { ContentType: 'image/png' } },
      { key: 'job-1/candidate-1-ark-render.png', metadata: { ContentType: 'image/png' } },
    ])
  } finally {
    legacy.configureRuntimeFetch()
    state.ossWriteMode = previousWriteMode
    state.ossWrites = previousWrites
    if (previous === undefined) delete process.env.PAPERBANANA_STRICT_OBJECT_STORAGE
    else process.env.PAPERBANANA_STRICT_OBJECT_STORAGE = previous
  }
})

test('new and historical result DTOs expose the authoritative bucket object key', async () => {
  const legacy = await loadLegacy()
  const state = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  const previousGateway = process.env.PAPERBANANA_GATEWAY_TOKEN
  state.ossWriteMode = 'success'
  state.jobRows = [{
    _id: 'historical-result-job',
    status: 'succeeded',
    userId: 'owner-1',
    resultImages: [{ filename: 'historical-result-job/candidate-0.png', storage: 'bucket', url: '' }],
    stages: [],
  }]
  process.env.PAPERBANANA_GATEWAY_TOKEN = 'test-gateway'
  try {
    const saved = await legacy.saveResult('job-1', 0, 'cG5n', 'image/png', 'base64')
    assert.equal(saved.objectKey, 'job-1/candidate-0.png')

    const detail = await legacy.default({
      request: { method: 'POST' },
      body: { action: 'getJob', jobId: 'historical-result-job', gatewayToken: 'test-gateway' },
      headers: {},
      response: { setHeader() {}, status() {} },
    })
    assert.equal(detail.job.resultImages[0].objectKey, 'historical-result-job/candidate-0.png')
  } finally {
    state.ossWriteMode = 'fail'
    state.jobRows = []
    if (previousGateway === undefined) delete process.env.PAPERBANANA_GATEWAY_TOKEN
    else process.env.PAPERBANANA_GATEWAY_TOKEN = previousGateway
  }
})

const canonicalFixedAspectRatios = ['1:1', '3:2', '2:3', '4:3', '3:4', '16:9', '9:16', '21:9', '1:4', '4:1']
const allImageAspectRatios = [...canonicalFixedAspectRatios, '1:2', '2:1', '4:5', '5:4', '1:8', '8:1', '5:2', '2:5', '9:21', '6:10', '14:10', '10:14', '19.5:9', '9:19.5', '20:9', '9:20', '1:3', '3:1', '5:8', '8:5', '9:22', '22:9', '9:23', '23:9', '3:8', '8:3', '5:12', '12:5', '10:16', '16:10', '2.35:1', '7:5', '5:7', '3:5', '5:3']
const commonImageAspectRatios = canonicalFixedAspectRatios.slice(0, 8)

test('v14 static image registry exposes exact canonical generation and refinement aspect-ratio contracts', async () => {
  const legacy = await loadLegacy()
  const expected = {
    gemini: {
      'gemini-3.1-flash-image': ['1:1', '3:2', '2:3', '4:3', '3:4', '16:9', '9:16', '21:9', '1:4', '4:1', '4:5', '5:4', '1:8', '8:1'],
      'gemini-3.1-flash-lite-image': [...commonImageAspectRatios, '4:5', '5:4'],
      'gemini-3-pro-image': [...commonImageAspectRatios, '4:5', '5:4'],
      'gemini-2.5-flash-image': [...commonImageAspectRatios, '4:5', '5:4'],
    },
    openai: {
      'gpt-image-2': allImageAspectRatios.filter(ratio => { const [w,h] = ratio.split(':').map(Number); return Math.max(w,h) / Math.min(w,h) <= 3 }),
      'gpt-image-1': ['1:1', '3:2', '2:3'],
      'gpt-image-1-mini': ['1:1', '3:2', '2:3'],
    },
    bailian: {
      'wan2.7-image-pro': allImageAspectRatios,
      'wan2.7-image': allImageAspectRatios,
      'qwen-image-3.0-pro': allImageAspectRatios,
      'qwen-image-2.0-pro': allImageAspectRatios,
      'qwen-image-2.0': allImageAspectRatios,
      'z-image-turbo': allImageAspectRatios,
    },
    ark: {
      'doubao-seedream-5-0-pro-260628': allImageAspectRatios,
      'doubao-seedream-5-0-260128': allImageAspectRatios,
      'doubao-seedream-4-5-251128': allImageAspectRatios,
      'doubao-seedream-4-0-250828': allImageAspectRatios,
    },
  } as const

  for (const [provider, providerExpected] of Object.entries(expected)) {
    const registry = await legacy.default({
      request: { method: 'POST' }, body: { action: 'modelRegistry', provider }, headers: {},
      response: { setHeader() {}, status() {} },
    })
    assert.equal(registry.registryVersion, '2026-09-09.v16')
    const models = new Map<string, any>(registry.providers[provider].models.map((entry: any) => [entry.id, entry]))
    for (const [modelId, ratios] of Object.entries(providerExpected)) {
      const capabilities = models.get(modelId)?.capabilities
      assert.deepEqual(capabilities?.aspectRatios, ratios, `${provider}/${modelId} generation ratios`)
      assert.deepEqual(capabilities?.refineAspectRatios, ratios, `${provider}/${modelId} refinement ratios`)
      assert.equal(capabilities.aspectRatios.includes('auto'), false)
      assert.equal(capabilities.refineAspectRatios.includes('auto'), false)
    }
    for (const model of models.values()) {
      if (!model.capabilities.imageGeneration) continue
      assert.ok(Array.isArray(model.capabilities.aspectRatios), `${provider}/${model.id} must expose aspectRatios`)
      assert.ok(Array.isArray(model.capabilities.refineAspectRatios), `${provider}/${model.id} must expose refineAspectRatios`)
      assert.equal(model.capabilities.aspectRatios.every((ratio: string) => allImageAspectRatios.includes(ratio)), true)
      assert.equal(model.capabilities.refineAspectRatios.every((ratio: string) => allImageAspectRatios.includes(ratio)), true)
    }
  }
})

test('OpenRouter registry intersects declared ratios with the canonical set and fails closed without a descriptor', async () => {
  const legacy = await loadLegacy()
  const models = [
    {
      id: 'vendor/declared-ratios', name: 'Declared Ratios',
      architecture: { input_modalities: ['text', 'image'], output_modalities: ['image'] },
      supported_parameters: {
        aspect_ratio: { type: 'enum', values: ['4:1', 'bogus', '1:1', 'auto', '4:1', '3:2'] },
        input_references: { max: 1 }, output_format: { values: ['png'] },
      },
    },
    {
      id: 'vendor/missing-ratios', name: 'Missing Ratios',
      architecture: { input_modalities: ['text'], output_modalities: ['image'] },
      supported_parameters: { output_format: { values: ['png'] } },
    },
  ]
  legacy.configureRuntimeFetch(async (input) => {
    const url = String(input)
    if (url.endsWith('/api/v1/models')) return Response.json({ data: [] })
    if (url.endsWith('/images/models')) return Response.json({ data: models })
    throw new Error(`unexpected request: ${url}`)
  })
  try {
    const registry = await legacy.default({
      request: { method: 'POST' }, body: { action: 'modelRegistry', provider: 'openrouter' }, headers: {},
      response: { setHeader() {}, status() {} },
    })
    const entries = new Map<string, any>(registry.providers.openrouter.models.map((entry: any) => [entry.id, entry]))
    assert.deepEqual(entries.get('vendor/declared-ratios').capabilities.aspectRatios, ['1:1', '3:2', '4:1'])
    assert.deepEqual(entries.get('vendor/declared-ratios').capabilities.refineAspectRatios, ['1:1', '3:2', '4:1'])
    assert.deepEqual(entries.get('vendor/missing-ratios').capabilities.aspectRatios, [])
    assert.deepEqual(entries.get('vendor/missing-ratios').capabilities.refineAspectRatios, [])
  } finally {
    legacy.configureRuntimeFetch()
  }
})

test('invalid and unsupported ratios reject before account checks, credentials, admission, persistence, or inference', async () => {
  const legacy = await loadLegacy()
  const state = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  const previousInserts = state.inserts
  const previousAccountQueries = state.accountDeletionFindQueries
  state.inserts = []
  state.accountDeletionFindQueries = []
  let providerCalls = 0
  legacy.configureRuntimeFetch(async () => {
    providerCalls += 1
    throw new Error('inference must not run')
  })
  const context = (body: Record<string, unknown>) => ({
    request: { method: 'POST' }, body, headers: { 'x-real-ip': '203.0.113.44' },
    response: { setHeader() {}, status() {} },
  })
  const createBase = {
    action: 'createJob', provider: 'openai', userId: 'ratio-owner', apiKeys: {},
    methodContent: 'A sufficiently detailed method section for exact ratio validation before any side effects.',
    caption: 'Exact ratio validation.', outputFormat: 'png', pipelineMode: 'vanilla', retrievalSetting: 'none', maxCriticRounds: 0,
    mainModelName: 'gpt-5.6-sol', imageModelName: 'gpt-image-2', referenceVisionModelName: 'gpt-5.6-sol',
  }
  const refineBase = {
    action: 'refineImage', provider: 'gemini', userId: 'ratio-owner', apiKeys: {},
    mainModelName: 'gemini-3.7-flash', imageModelName: 'gemini-3.1-flash-lite-image', referenceVisionModelName: 'gemini-3.7-flash',
    sourceImageObjectKey: 'owned/source.png', editInstruction: 'Make the labels clearer.', imageSize: '1K',
  }
  try {
    assert.deepEqual(await legacy.default(context({ ...createBase, aspectRatio: '999:1' })), {
      code: 400, error: 'Invalid aspectRatio', businessCode: 'INVALID_ASPECT_RATIO',
    })
    const unsupportedCreate = await legacy.default(context({ ...createBase, aspectRatio: '1:4' }))
    assert.equal(unsupportedCreate.code, 400)
    assert.equal(unsupportedCreate.businessCode, 'ASPECT_RATIO_UNSUPPORTED')

    assert.deepEqual(await legacy.default(context({ ...refineBase, aspectRatio: '999:1' })), {
      code: 400, error: 'Invalid aspectRatio', businessCode: 'INVALID_ASPECT_RATIO',
    })
    const unsupportedRefine = await legacy.default(context({ ...refineBase, aspectRatio: '1:4' }))
    assert.equal(unsupportedRefine.code, 400)
    assert.equal(unsupportedRefine.businessCode, 'REFINE_ASPECT_RATIO_UNSUPPORTED')

    assert.equal(state.accountDeletionFindQueries.length, 0)
    assert.equal(state.inserts.length, 0)
    assert.equal(providerCalls, 0)
    assert.deepEqual(legacy.getJobAdmissionState(), { accepting: true, active: 0, queued: 0, reserved: 0, tracked: 0 })
  } finally {
    legacy.configureRuntimeFetch()
    state.inserts = previousInserts
    state.accountDeletionFindQueries = previousAccountQueries
  }
})

test('unsupported create ratio rejects before manual-reference database lookup', async () => {
  const legacy = await loadLegacy()
  const state = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  const previousReferenceRows = state.referenceRows
  const previousReferenceQueries = state.referenceFindQueries
  state.referenceRows = []
  state.referenceFindQueries = []
  try {
    const result = await legacy.default({
      request: { method: 'POST' },
      body: {
        action: 'createJob', provider: 'openai', apiKeys: {}, aspectRatio: '1:4',
        methodContent: 'A sufficiently detailed method section with a manual reference that must not be queried.',
        caption: 'Reject before reference lookup.', outputFormat: 'png', pipelineMode: 'vanilla', maxCriticRounds: 0,
        retrievalSetting: 'manual', manualReferenceIds: ['ref_never_query'],
        mainModelName: 'gpt-5.6-sol', imageModelName: 'gpt-image-2', referenceVisionModelName: 'gpt-5.6-sol',
      },
      headers: {}, response: { setHeader() {}, status() {} },
    })
    assert.equal(result.businessCode, 'ASPECT_RATIO_UNSUPPORTED')
    assert.equal(state.referenceFindQueries.length, 0)
  } finally {
    state.referenceRows = previousReferenceRows
    state.referenceFindQueries = previousReferenceQueries
  }
})

test('non-image create routes keep canonical fixed ratios and public jobs preserve auto unchanged', async () => {
  const legacy = await loadLegacy()
  const state = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  const previousInserts = state.inserts
  const previousRows = state.jobRows
  const previousGateway = process.env.PAPERBANANA_GATEWAY_TOKEN
  state.inserts = []
  state.jobRows = []
  delete process.env.PAPERBANANA_GATEWAY_TOKEN
  legacy.configureRuntimeFetch(async () => Response.json({ choices: [{ message: { content: '<svg xmlns="http://www.w3.org/2000/svg"></svg>' } }] }))
  try {
    const queued = await legacy.default({
      request: { method: 'POST' },
      body: {
        action: 'createJob', provider: 'openai', apiKeys: { openai: 'key' }, aspectRatio: '4:1',
        methodContent: 'A sufficiently detailed method section rendered directly as an SVG without an image route.',
        caption: 'SVG ratio preservation.', outputFormat: 'svg', pipelineMode: 'vanilla', retrievalSetting: 'none', maxCriticRounds: 0,
        mainModelName: 'gpt-5.6-sol', imageModelName: 'gpt-image-2', referenceVisionModelName: 'gpt-5.6-sol',
      },
      headers: {}, response: { setHeader() {}, status() {} },
    })
    assert.equal(queued.code, 0, JSON.stringify(queued))
    assert.equal(state.inserts[0].aspectRatio, '4:1')
    await legacy.drainJobAdmission()

    state.jobRows = [{ _id: 'auto-ratio', status: 'succeeded', aspectRatio: 'auto', resultImages: [], stages: [] }]
    process.env.PAPERBANANA_GATEWAY_TOKEN = 'ratio-gateway'
    const detail = await legacy.default({
      request: { method: 'POST' }, body: { action: 'getJob', jobId: 'auto-ratio', gatewayToken: 'ratio-gateway' }, headers: {},
      response: { setHeader() {}, status() {} },
    })
    assert.equal(detail.job.aspectRatio, 'auto')
  } finally {
    legacy.configureRuntimeFetch()
    state.inserts = previousInserts
    state.jobRows = previousRows
    if (previousGateway === undefined) delete process.env.PAPERBANANA_GATEWAY_TOKEN
    else process.env.PAPERBANANA_GATEWAY_TOKEN = previousGateway
  }
})

test('static adapters encode exact supported ratios and delegate auto without silent landscape fallback', async () => {
  const legacy = await loadLegacy()
  const calls: Array<{ url: string; body: any }> = []
  legacy.configureRuntimeFetch(async (input, init) => {
    const url = String(input)
    let body: any = init?.body
    if (body instanceof FormData) body = { size: body.get('size') }
    else if (typeof body === 'string') body = JSON.parse(body)
    calls.push({ url, body })
    if (url.includes('/multimodal-generation/generation')) {
      return Response.json({ output: { choices: [{ message: { content: [{ image: 'https://images.invalid/result.png' }] } }] } })
    }
    if (url === 'https://images.invalid/result.png') return new Response('image-bytes', { headers: { 'Content-Type': 'image/png' } })
    if (url.endsWith('/v1beta/interactions')) return Response.json({ output_image: { data: onePixelPngBase64 } })
    if (url.endsWith('/v1/images/generations') || url.endsWith('/v1/images/edits')) return Response.json({ data: [{ b64_json: onePixelPngBase64 }] })
    if (url.includes('ark.cn-beijing.volces.com')) return Response.json({ data: [{ b64_json: onePixelPngBase64 }] })
    throw new Error(`unexpected request: ${url}`)
  })
  try {
    await legacy.callImageModel('openai', 'gpt-image-2', 'key', 'portrait', '2:3')
    await legacy.callImageModel('openai', 'gpt-image-2', 'key', 'default', 'auto')
    await legacy.callImageModel('openai', 'gpt-image-2', 'key', 'edit', '3:2', `data:image/png;base64,${onePixelPngBase64}`)
    await legacy.callImageModel('gemini', 'gemini-3.1-flash-image', 'key', 'extreme', '1:4')
    await legacy.callImageModel('gemini', 'gemini-3.1-flash-image', 'key', 'default', 'auto')
    await legacy.callImageModel('bailian', 'wan2.7-image-pro', 'key', 'extreme', '1:4', '', '2K')
    await legacy.callImageModel('bailian', 'wan2.7-image-pro', 'key', 'default', 'auto', '', '2K')
    await legacy.callImageModel('bailian', 'z-image-turbo', 'key', 'documented ultrawide', '21:9', '', '2K')
    await legacy.callImageModel('ark', 'doubao-seedream-4-0-250828', 'key', 'wide', '16:9', '', '2K')
    await legacy.callImageModel('ark', 'doubao-seedream-4-0-250828', 'key', 'default', 'auto', '', '2K')
    await legacy.callImageModel('bailian', 'qwen-image-2.0-pro', 'key', 'newly supported', '4:1', '', '2K')
    await legacy.callImageModel('ark', 'doubao-seedream-4-0-250828', 'key', 'newly supported', '4:3', '', '2K')
    await assert.rejects(
      legacy.callImageModel('openai', 'gpt-image-2', 'key', 'invalid', '999:1'),
      /Unsupported aspect ratio/,
    )
  } finally {
    legacy.configureRuntimeFetch()
  }

  const openAiCalls = calls.filter((call) => call.url.includes('api.openai.com/v1/images'))
  assert.deepEqual(openAiCalls.map((call) => call.body.size), ['1344x2016', '2048x2048', '2016x1344'])
  const geminiCalls = calls.filter((call) => call.url.endsWith('/v1beta/interactions'))
  assert.equal(geminiCalls[0].body.response_format.aspect_ratio, '1:4')
  assert.equal(Object.hasOwn(geminiCalls[1].body.response_format, 'aspect_ratio'), false)
  const bailianCalls = calls.filter((call) => call.url.includes('/multimodal-generation/generation'))
  assert.equal(bailianCalls[0].body.parameters.size, '1024*4096')
  assert.equal(bailianCalls[1].body.parameters.size, '2K')
  assert.equal(bailianCalls[2].body.parameters.size, '3122*1338')
  const arkCalls = calls.filter((call) => call.url.includes('ark.cn-beijing.volces.com'))
  assert.deepEqual(arkCalls.map((call) => call.body.size), ['2720x1530', '2K', '2364x1773'])
})

test('OpenRouter sends only an exactly declared fixed ratio and omits auto', async () => {
  const legacy = await loadLegacy()
  const imageBodies: any[] = []
  const model = {
    id: 'vendor/exact-ratio', name: 'Exact Ratio',
    architecture: { input_modalities: ['text'], output_modalities: ['image'] },
    supported_parameters: {
      aspect_ratio: { type: 'enum', values: ['1:1', '4:3'] },
      output_format: { values: ['png'] },
    },
  }
  legacy.configureRuntimeFetch(async (input, init) => {
    const url = String(input)
    if (url.endsWith('/images/models')) return Response.json({ data: [model] })
    if (url.endsWith('/api/v1/images')) {
      imageBodies.push(JSON.parse(String(init?.body || '{}')))
      return Response.json({ data: [{ b64_json: onePixelPngBase64 }] })
    }
    throw new Error(`unexpected request: ${url}`)
  })
  try {
    await legacy.callImageModel('openrouter', `openrouter/${model.id}`, 'key', 'fixed', '4:3')
    await legacy.callImageModel('openrouter', `openrouter/${model.id}`, 'key', 'default', 'auto')
    await assert.rejects(
      legacy.callImageModel('openrouter', `openrouter/${model.id}`, 'key', 'unsupported', '3:2'),
      /does not declare requested aspect ratio 3:2/,
    )
  } finally {
    legacy.configureRuntimeFetch()
  }
  assert.equal(imageBodies[0].aspect_ratio, '4:3')
  assert.equal(Object.hasOwn(imageBodies[1], 'aspect_ratio'), false)
  assert.equal(imageBodies.length, 2)
})

const inputOptimizationGatewayToken = 'input-optimization-gateway-token'
const inputOptimizationApiKey = 'input-optimization-secret-key'

function inputOptimizationContext(body: Record<string, unknown>) {
  return {
    request: { method: 'POST' },
    body,
    headers: {},
    response: { setHeader() {}, status() {} },
  }
}

function inputOptimizationBody(overrides: Record<string, unknown> = {}) {
  return {
    action: 'optimizeInputs',
    gatewayToken: inputOptimizationGatewayToken,
    target: 'methodContent',
    inputs: {
      methodContent: 'The encoder processes the input.',
      caption: 'Encoder overview.',
      negativePrompt: 'blurry labels',
    },
    mainRoute: { accessProvider: 'openai', modelId: 'gpt-5.6-sol' },
    apiKey: inputOptimizationApiKey,
    ...overrides,
  }
}

function inputOptimizationChatResponse(text: string) {
  return Response.json({ choices: [{ message: { content: text } }] })
}

function inputOptimizationOpenRouterCatalog(modelId = 'openai/gpt-5.6-sol') {
  return {
    data: [{
      id: modelId,
      name: modelId,
      architecture: { input_modalities: ['text'], output_modalities: ['text'] },
      supported_parameters: {},
    }],
  }
}

test('input optimization advertises contract version 1 and requires the gateway trust boundary', async () => {
  const legacy = await loadLegacy()
  const previousGateway = process.env.PAPERBANANA_GATEWAY_TOKEN
  process.env.PAPERBANANA_GATEWAY_TOKEN = inputOptimizationGatewayToken
  let inferenceCalls = 0
  legacy.configureRuntimeFetch(async () => {
    inferenceCalls += 1
    return inputOptimizationChatResponse('A clearer encoder method.')
  })
  try {
    const registry = await legacy.default(inputOptimizationContext({ action: 'modelRegistry' }))
    assert.equal(registry.inputOptimizationContractVersion, 1)
    inferenceCalls = 0

    const denied = await legacy.default(inputOptimizationContext(inputOptimizationBody({ gatewayToken: undefined })))
    assert.equal(denied.code, 401)
    assert.equal(inferenceCalls, 0)
  } finally {
    legacy.configureRuntimeFetch()
    if (previousGateway === undefined) delete process.env.PAPERBANANA_GATEWAY_TOKEN
    else process.env.PAPERBANANA_GATEWAY_TOKEN = previousGateway
  }
})

test('input optimization gives each target conservative instructions and all three fields as read-only JSON context', async () => {
  const legacy = await loadLegacy()
  const previousGateway = process.env.PAPERBANANA_GATEWAY_TOKEN
  process.env.PAPERBANANA_GATEWAY_TOKEN = inputOptimizationGatewayToken
  const requests: any[] = []
  const outputs: Record<string, string> = {
    methodContent: 'The encoder processes the input in a clear causal sequence.',
    caption: 'Concise visualization of the encoder overview.',
    negativePrompt: 'Avoid blurry labels, visual clutter, and illegible text.',
  }
  legacy.configureRuntimeFetch(async (_input, init) => {
    const body = JSON.parse(String(init?.body || '{}'))
    requests.push(body)
    const user = String(body.messages?.[1]?.content || '')
    const target = (['methodContent', 'caption', 'negativePrompt'] as const).find((candidate) => user.includes(`\"target\":\"${candidate}\"`))
    return inputOptimizationChatResponse(outputs[target || 'methodContent'])
  })
  try {
    for (const target of ['methodContent', 'caption', 'negativePrompt'] as const) {
      const result = await legacy.default(inputOptimizationContext(inputOptimizationBody({ target })))
      assert.deepEqual(result, { code: 0, target, optimizedText: outputs[target] })
    }
  } finally {
    legacy.configureRuntimeFetch()
    if (previousGateway === undefined) delete process.env.PAPERBANANA_GATEWAY_TOKEN
    else process.env.PAPERBANANA_GATEWAY_TOKEN = previousGateway
  }

  assert.equal(requests.length, 3)
  for (const [index, target] of (['methodContent', 'caption', 'negativePrompt'] as const).entries()) {
    const system = String(requests[index].messages?.[0]?.content || '')
    const user = String(requests[index].messages?.[1]?.content || '')
    assert.match(system, /untrusted data/i)
    assert.match(system, /original language/i)
    assert.match(system, /do not (?:add|invent).*scientific facts/i)
    assert.match(system, /proper nouns/i)
    assert.match(system, /other two fields.*read-only/i)
    assert.match(system, /plain text/i)
    assert.match(user, /\{"target":"(?:methodContent|caption|negativePrompt)","inputs":\{/)
    assert.match(user, /"methodContent":"The encoder processes the input\."/)
    assert.match(user, /"caption":"Encoder overview\."/)
    assert.match(user, /"negativePrompt":"blurry labels"/)
    if (target === 'methodContent') assert.match(system, /structure.*causal.*stages/i)
    if (target === 'caption') assert.match(system, /visualization intent.*concise/i)
    if (target === 'negativePrompt') assert.match(system, /executable visual prohibitions/i)
  }
})

test('input optimization dispatches each exact authoritative main route once without images or fallback', async () => {
  const legacy = await loadLegacy()
  const previousGateway = process.env.PAPERBANANA_GATEWAY_TOKEN
  process.env.PAPERBANANA_GATEWAY_TOKEN = inputOptimizationGatewayToken
  const fixtures = [
    { provider: 'gemini', modelId: 'gemini-3.7-flash', endpoint: /generativelanguage\.googleapis\.com\/v1beta\/models\/gemini-3\.7-flash:generateContent/ },
    { provider: 'openai', modelId: 'gpt-5.6-sol', endpoint: /api\.openai\.com\/v1\/chat\/completions/ },
    { provider: 'bailian', modelId: 'qwen3.8-max', endpoint: /dashscope\.aliyuncs\.com\/compatible-mode\/v1\/chat\/completions/ },
    { provider: 'ark', modelId: 'doubao-seed-2-1-pro-260628', endpoint: /ark\.cn-beijing\.volces\.com\/api\/v3\/chat\/completions/ },
    { provider: 'openrouter', modelId: 'openai/gpt-5.6-sol', endpoint: /openrouter\.ai\/api\/v1\/chat\/completions/ },
  ]
  try {
    for (const fixture of fixtures) {
      const inferenceRequests: Array<{ url: string; init?: RequestInit; body: any }> = []
      legacy.configureRuntimeFetch(async (input, init) => {
        const url = String(input)
        if (url.endsWith('/api/v1/models')) return Response.json(inputOptimizationOpenRouterCatalog(fixture.modelId))
        if (url.endsWith('/api/v1/images/models')) return Response.json({ data: [] })
        const body = JSON.parse(String(init?.body || '{}'))
        inferenceRequests.push({ url, init, body })
        if (fixture.provider === 'gemini') {
          return Response.json({ candidates: [{ content: { parts: [{ text: 'A clearer encoder method.' }] } }] })
        }
        return inputOptimizationChatResponse('A clearer encoder method.')
      })

      const result = await legacy.default(inputOptimizationContext(inputOptimizationBody({
        mainRoute: { accessProvider: fixture.provider, modelId: fixture.modelId },
      })))
      assert.deepEqual(result, { code: 0, target: 'methodContent', optimizedText: 'A clearer encoder method.' })
      assert.equal(inferenceRequests.length, 1, fixture.provider)
      assert.match(inferenceRequests[0].url, fixture.endpoint, fixture.provider)
      if (fixture.provider !== 'gemini') assert.equal(inferenceRequests[0].body.model, fixture.modelId, fixture.provider)
      const serializedBody = JSON.stringify(inferenceRequests[0].body)
      assert.doesNotMatch(serializedBody, /image_url|inlineData|input_image/, fixture.provider)
      assert.ok(inferenceRequests[0].init?.signal instanceof AbortSignal, fixture.provider)
    }
  } finally {
    legacy.configureRuntimeFetch()
    if (previousGateway === undefined) delete process.env.PAPERBANANA_GATEWAY_TOKEN
    else process.env.PAPERBANANA_GATEWAY_TOKEN = previousGateway
  }
})

test('input optimization rejects malformed, empty, and oversized inputs before inference', async () => {
  const legacy = await loadLegacy()
  const previousGateway = process.env.PAPERBANANA_GATEWAY_TOKEN
  process.env.PAPERBANANA_GATEWAY_TOKEN = inputOptimizationGatewayToken
  let inferenceCalls = 0
  legacy.configureRuntimeFetch(async () => {
    inferenceCalls += 1
    return inputOptimizationChatResponse('must not run')
  })
  const invalidBodies = [
    inputOptimizationBody({ target: 'unknown' }),
    inputOptimizationBody({ target: 1 }),
    inputOptimizationBody({ inputs: null }),
    inputOptimizationBody({ inputs: { methodContent: 1, caption: '', negativePrompt: '' } }),
    inputOptimizationBody({ inputs: { methodContent: '   ', caption: 'caption', negativePrompt: '' } }),
    inputOptimizationBody({ target: 'caption', inputs: { methodContent: 'method', caption: '   ', negativePrompt: '' } }),
    inputOptimizationBody({ target: 'negativePrompt', inputs: { methodContent: ' ', caption: '', negativePrompt: '  ' } }),
    inputOptimizationBody({ inputs: { methodContent: 'm'.repeat(12_001), caption: 'caption', negativePrompt: '' } }),
    inputOptimizationBody({ inputs: { methodContent: 'method', caption: 'c'.repeat(1_001), negativePrompt: '' } }),
    inputOptimizationBody({ inputs: { methodContent: 'method', caption: 'caption', negativePrompt: 'n'.repeat(1_001) } }),
  ]
  try {
    for (const body of invalidBodies) {
      const result = await legacy.default(inputOptimizationContext(body))
      assert.equal(result.code, 400)
      assert.equal(result.businessCode, 'INPUT_OPTIMIZATION_REQUEST_INVALID')
      assert.equal(result.error, 'Invalid input optimization request.')
    }
  } finally {
    legacy.configureRuntimeFetch()
    if (previousGateway === undefined) delete process.env.PAPERBANANA_GATEWAY_TOKEN
    else process.env.PAPERBANANA_GATEWAY_TOKEN = previousGateway
  }
  assert.equal(inferenceCalls, 0)
})

test('input optimization rejects non-main, non-selectable, unknown, and malformed routes before inference', async () => {
  const legacy = await loadLegacy()
  const previousGateway = process.env.PAPERBANANA_GATEWAY_TOKEN
  process.env.PAPERBANANA_GATEWAY_TOKEN = inputOptimizationGatewayToken
  let inferenceCalls = 0
  legacy.configureRuntimeFetch(async () => {
    inferenceCalls += 1
    return inputOptimizationChatResponse('must not run')
  })
  const routes = [
    null,
    { accessProvider: 'openai', modelId: 1 },
    { accessProvider: 'unknown', modelId: 'gpt-5.6-sol' },
    { accessProvider: 'openai', modelId: 'missing-model' },
    { accessProvider: 'openai', modelId: 'gpt-image-2' },
    { accessProvider: 'ark', modelId: 'doubao-seed-character-260628' },
  ]
  try {
    for (const mainRoute of routes) {
      const result = await legacy.default(inputOptimizationContext(inputOptimizationBody({ mainRoute })))
      assert.equal(result.code, 400)
      assert.equal(result.businessCode, 'INPUT_OPTIMIZATION_ROUTE_INVALID')
      assert.equal(result.error, 'Invalid input optimization route.')
    }
  } finally {
    legacy.configureRuntimeFetch()
    if (previousGateway === undefined) delete process.env.PAPERBANANA_GATEWAY_TOKEN
    else process.env.PAPERBANANA_GATEWAY_TOKEN = previousGateway
  }
  assert.equal(inferenceCalls, 0)
})

test('input optimization requires one non-empty singular API key before inference', async () => {
  const legacy = await loadLegacy()
  const previousGateway = process.env.PAPERBANANA_GATEWAY_TOKEN
  process.env.PAPERBANANA_GATEWAY_TOKEN = inputOptimizationGatewayToken
  let inferenceCalls = 0
  legacy.configureRuntimeFetch(async () => {
    inferenceCalls += 1
    return inputOptimizationChatResponse('must not run')
  })
  try {
    for (const apiKey of [undefined, null, 1, '', '   ']) {
      const result = await legacy.default(inputOptimizationContext(inputOptimizationBody({ apiKey })))
      assert.equal(result.code, 400)
      assert.equal(result.businessCode, 'INPUT_OPTIMIZATION_KEY_REQUIRED')
      assert.equal(result.error, 'Input optimization API key is required.')
    }
  } finally {
    legacy.configureRuntimeFetch()
    if (previousGateway === undefined) delete process.env.PAPERBANANA_GATEWAY_TOKEN
    else process.env.PAPERBANANA_GATEWAY_TOKEN = previousGateway
  }
  assert.equal(inferenceCalls, 0)
})

test('input optimization preserves scientific tokens byte-for-byte and rejects drift', async () => {
  const legacy = await loadLegacy()
  const previousGateway = process.env.PAPERBANANA_GATEWAY_TOKEN
  process.env.PAPERBANANA_GATEWAY_TOKEN = inputOptimizationGatewayToken
  const original = 'We use $x_i$ and $$L=\\sum_i x_i$$ with \\(z=1\\), \\[A=2\\], and \\citep{Smith2025}. Accuracy is 95%, latency is 12 ms, with [1], [1-3], and [1, 2]; see https://example.org/v1?q=2 and DOI 10.1000/xyz-123.'
  const preserved = `${original} The stages are now described in causal order.`
  let output = preserved
  legacy.configureRuntimeFetch(async () => inputOptimizationChatResponse(output))
  try {
    const success = await legacy.default(inputOptimizationContext(inputOptimizationBody({
      inputs: { methodContent: original, caption: 'Overview.', negativePrompt: '' },
    })))
    assert.deepEqual(success, { code: 0, target: 'methodContent', optimizedText: preserved })

    const drifts = [
      preserved.replace('$x_i$', '$y_i$'),
      preserved.replace('\\citep{Smith2025}', '\\citep{Jones2026}'),
      preserved.replace('95%', '96%'),
      preserved.replace('12 ms', '112 ms'),
      preserved.replace('[1-3]', '[1-4]'),
      preserved.replace('https://example.org/v1?q=2', 'https://example.org/v2?q=2'),
      preserved.replace('10.1000/xyz-123', '10.1000/xyz-124'),
    ]
    for (const drifted of drifts) {
      output = drifted
      const result = await legacy.default(inputOptimizationContext(inputOptimizationBody({
        inputs: { methodContent: original, caption: 'Overview.', negativePrompt: '' },
      })))
      assert.equal(result.code, 422)
      assert.equal(result.businessCode, 'INPUT_OPTIMIZATION_RESULT_INVALID')
      assert.equal(result.error, 'Input optimization returned an invalid result.')
    }
  } finally {
    legacy.configureRuntimeFetch()
    if (previousGateway === undefined) delete process.env.PAPERBANANA_GATEWAY_TOKEN
    else process.env.PAPERBANANA_GATEWAY_TOKEN = previousGateway
  }
})

test('input optimization preserves URL and DOI tokens without freezing surrounding sentence punctuation', async () => {
  const legacy = await loadLegacy()
  const previousGateway = process.env.PAPERBANANA_GATEWAY_TOKEN
  process.env.PAPERBANANA_GATEWAY_TOKEN = inputOptimizationGatewayToken
  const original = 'See https://example.org/paper and DOI 10.1000/xyz-123.'
  const output = 'See https://example.org/paper; DOI 10.1000/xyz-123 remains the source.'
  legacy.configureRuntimeFetch(async () => inputOptimizationChatResponse(output))
  try {
    const result = await legacy.default(inputOptimizationContext(inputOptimizationBody({
      inputs: { methodContent: original, caption: 'Source overview.', negativePrompt: '' },
    })))
    assert.deepEqual(result, { code: 0, target: 'methodContent', optimizedText: output })
  } finally {
    legacy.configureRuntimeFetch()
    if (previousGateway === undefined) delete process.env.PAPERBANANA_GATEWAY_TOKEN
    else process.env.PAPERBANANA_GATEWAY_TOKEN = previousGateway
  }
})

test('input optimization rejects empty, unchanged, and oversized provider candidates', async () => {
  const legacy = await loadLegacy()
  const previousGateway = process.env.PAPERBANANA_GATEWAY_TOKEN
  process.env.PAPERBANANA_GATEWAY_TOKEN = inputOptimizationGatewayToken
  let output = ''
  legacy.configureRuntimeFetch(async () => inputOptimizationChatResponse(output))
  try {
    output = '   '
    const empty = await legacy.default(inputOptimizationContext(inputOptimizationBody()))
    assert.equal(empty.code, 422)
    assert.equal(empty.businessCode, 'INPUT_OPTIMIZATION_RESULT_INVALID')

    output = '  The encoder processes the input.  '
    const unchanged = await legacy.default(inputOptimizationContext(inputOptimizationBody()))
    assert.equal(unchanged.code, 422)
    assert.equal(unchanged.businessCode, 'INPUT_OPTIMIZATION_NO_CHANGE')
    assert.equal(unchanged.error, 'Input optimization returned no change.')

    output = 'm'.repeat(12_001)
    const oversized = await legacy.default(inputOptimizationContext(inputOptimizationBody()))
    assert.equal(oversized.code, 422)
    assert.equal(oversized.businessCode, 'INPUT_OPTIMIZATION_RESULT_INVALID')
  } finally {
    legacy.configureRuntimeFetch()
    if (previousGateway === undefined) delete process.env.PAPERBANANA_GATEWAY_TOKEN
    else process.env.PAPERBANANA_GATEWAY_TOKEN = previousGateway
  }
})

test('input optimization maps one network rejection to a stable redacted provider failure', async () => {
  const legacy = await loadLegacy()
  const previousGateway = process.env.PAPERBANANA_GATEWAY_TOKEN
  process.env.PAPERBANANA_GATEWAY_TOKEN = inputOptimizationGatewayToken
  let inferenceCalls = 0
  const providerSecret = `provider body ${inputOptimizationApiKey} https://internal.invalid/generate`
  legacy.configureRuntimeFetch(async () => {
    inferenceCalls += 1
    throw new Error(providerSecret)
  })
  try {
    const result = await legacy.default(inputOptimizationContext(inputOptimizationBody()))
    assert.deepEqual(result, {
      code: 502,
      error: 'Input optimization provider request failed.',
      businessCode: 'INPUT_OPTIMIZATION_PROVIDER_FAILED',
    })
    assert.equal(inferenceCalls, 1)
    assert.doesNotMatch(JSON.stringify(result), new RegExp(inputOptimizationApiKey))
    assert.doesNotMatch(JSON.stringify(result), /provider body|internal\.invalid/)
  } finally {
    legacy.configureRuntimeFetch()
    if (previousGateway === undefined) delete process.env.PAPERBANANA_GATEWAY_TOKEN
    else process.env.PAPERBANANA_GATEWAY_TOKEN = previousGateway
  }
})

test('input optimization maps one abort rejection to a stable redacted timeout', async () => {
  const legacy = await loadLegacy()
  const previousGateway = process.env.PAPERBANANA_GATEWAY_TOKEN
  process.env.PAPERBANANA_GATEWAY_TOKEN = inputOptimizationGatewayToken
  let inferenceCalls = 0
  legacy.configureRuntimeFetch(async (_input, init) => {
    inferenceCalls += 1
    assert.ok(init?.signal instanceof AbortSignal)
    throw new DOMException(`timeout ${inputOptimizationApiKey} https://internal.invalid/timeout`, 'AbortError')
  })
  try {
    const result = await legacy.default(inputOptimizationContext(inputOptimizationBody()))
    assert.deepEqual(result, {
      code: 504,
      error: 'Input optimization provider timed out.',
      businessCode: 'INPUT_OPTIMIZATION_PROVIDER_TIMEOUT',
    })
    assert.equal(inferenceCalls, 1)
    assert.doesNotMatch(JSON.stringify(result), new RegExp(inputOptimizationApiKey))
    assert.doesNotMatch(JSON.stringify(result), /internal\.invalid/)
  } finally {
    legacy.configureRuntimeFetch()
    if (previousGateway === undefined) delete process.env.PAPERBANANA_GATEWAY_TOKEN
    else process.env.PAPERBANANA_GATEWAY_TOKEN = previousGateway
  }
})

test('input optimization hides a non-2xx provider response body after one inference call', async () => {
  const legacy = await loadLegacy()
  const previousGateway = process.env.PAPERBANANA_GATEWAY_TOKEN
  process.env.PAPERBANANA_GATEWAY_TOKEN = inputOptimizationGatewayToken
  let inferenceCalls = 0
  legacy.configureRuntimeFetch(async () => {
    inferenceCalls += 1
    return Response.json({ error: { message: `raw ${inputOptimizationApiKey} https://internal.invalid/body` } }, { status: 500 })
  })
  try {
    const result = await legacy.default(inputOptimizationContext(inputOptimizationBody()))
    assert.equal(result.code, 502)
    assert.equal(result.businessCode, 'INPUT_OPTIMIZATION_PROVIDER_FAILED')
    assert.equal(inferenceCalls, 1)
    assert.doesNotMatch(JSON.stringify(result), new RegExp(inputOptimizationApiKey))
    assert.doesNotMatch(JSON.stringify(result), /raw|internal\.invalid/)
  } finally {
    legacy.configureRuntimeFetch()
    if (previousGateway === undefined) delete process.env.PAPERBANANA_GATEWAY_TOKEN
    else process.env.PAPERBANANA_GATEWAY_TOKEN = previousGateway
  }
})

test('input optimization leaves the existing callTextModel default retry count unchanged', async () => {
  const legacy = await loadLegacy()
  let attempts = 0
  legacy.configureRuntimeFetch(async () => {
    attempts += 1
    if (attempts === 1) throw new Error('transient network rejection')
    return inputOptimizationChatResponse('existing retry succeeded')
  })
  try {
    const result = await legacy.callTextModel('openai', 'gpt-5.6-sol', 'key', 'system', 'user')
    assert.equal(result, 'existing retry succeeded')
    assert.equal(attempts, 2)
  } finally {
    legacy.configureRuntimeFetch()
  }
})

test('new native providers expose only documented roles and preserve exact model IDs', async () => {
  const legacy = await loadLegacy()
  legacy.configureRuntimeFetch(async () => { throw new Error('Catalog must not invoke a provider') })
  for (const provider of ['deepseek', 'kimi', 'zhipu', 'siliconflow', 'anthropic', 'recraft', 'xai']) {
    const result = await legacy.default({ request: { method: 'POST' }, body: { action: 'modelRegistry', provider }, response: { setHeader() {}, status() {} } })
    assert.equal(result.code, 0)
    const registry = result.providers[provider]
    assert.ok(registry.models.length)
    for (const role of ['main', 'image', 'vision']) {
      const options = registry.models.filter((model: any) => model.roles.includes(role))
      if (options.length) assert.ok(options.some((model: any) => model.id === registry.defaults[role]))
      else assert.equal(registry.defaults[role], '')
    }
    for (const model of registry.models) {
      assert.equal(model.verificationState, 'catalog')
      assert.equal(model.verified, false)
      assert.match(model.officialSourceUrl, /^https:\/\//)
    }
    if (['deepseek', 'kimi', 'anthropic'].includes(provider)) assert.equal(registry.defaults.image, '')
    if (provider === 'recraft') assert.deepEqual([registry.defaults.main, registry.defaults.vision], ['', ''])
  }
})

test('native chat adapters keep model IDs, vision parts and credentials on the selected endpoint', async () => {
  const legacy = await loadLegacy()
  const calls: any[] = []
  legacy.configureRuntimeFetch(async (url, init) => {
    calls.push({ url: String(url), headers: new Headers(init?.headers), body: JSON.parse(String(init?.body)) })
    return Response.json({ choices: [{ message: { content: 'diagram plan' } }] })
  })
  for (const [provider, model, endpoint] of [
    ['deepseek', 'deepseek-v4-flash-vision-exp', 'https://api.deepseek.com/v1/chat/completions'],
    ['kimi', 'kimi-k3', 'https://api.moonshot.cn/v1/chat/completions'],
    ['zhipu', 'glm-5v-turbo', 'https://open.bigmodel.cn/api/paas/v4/chat/completions'],
    ['siliconflow', 'Pro/moonshotai/Kimi-K2.6', 'https://api.siliconflow.cn/v1/chat/completions'],
  ]) {
    assert.equal(await legacy.callTextModel(provider, model, `${provider}-key`, 'system', 'user'), 'diagram plan')
    assert.equal(await legacy.callVisionModel(provider, model, `${provider}-key`, 'method', 'caption', [{ url: `data:image/png;base64,${onePixelPngBase64}`, mimeType: 'image/png' }]), 'diagram plan')
    for (const call of calls.splice(0)) {
      assert.equal(call.url, endpoint)
      assert.equal(call.headers.get('authorization'), `Bearer ${provider}-key`)
      assert.equal(call.body.model, model)
      assert.equal(call.body.temperature, undefined)
    }
  }
  await assert.rejects(legacy.callTextModel('recraft', 'recraftv4_1', 'private-key', 'system', 'user'), /does not support Chat Completions/)
  assert.equal(calls.length, 0)
})

test('Claude uses native Messages while xAI uses Responses for text and vision', async () => {
  const legacy = await loadLegacy()
  const calls: any[] = []
  legacy.configureRuntimeFetch(async (url, init) => {
    calls.push({ url: String(url), headers: new Headers(init?.headers), body: JSON.parse(String(init?.body)) })
    return Response.json(String(url).includes('anthropic')
      ? { stop_reason: 'end_turn', content: [{ type: 'thinking', thinking: 'hidden' }, { type: 'text', text: 'visible' }] }
      : { output: [{ type: 'reasoning', summary: [] }, { type: 'message', content: [{ type: 'output_text', text: 'visible' }] }] })
  })
  const images = [{ url: `data:image/png;base64,${onePixelPngBase64}`, mimeType: 'image/png' }]
  for (const [provider, model] of [['anthropic', 'claude-fable-5-1'], ['xai', 'grok-4.6']]) {
    assert.equal(await legacy.callTextModel(provider, model, `${provider}-key`, 'system', 'user', images), 'visible')
    assert.equal(await legacy.callVisionModel(provider, model, `${provider}-key`, 'method', 'caption', images), 'visible')
  }
  for (const call of calls.slice(0, 2)) {
    assert.equal(call.url, 'https://api.anthropic.com/v1/messages')
    assert.equal(call.headers.get('x-api-key'), 'anthropic-key')
    assert.equal(call.headers.get('authorization'), null)
    assert.equal(call.headers.get('anthropic-version'), '2023-06-01')
    assert.equal(call.body.messages[0].content[1].source.data, onePixelPngBase64)
    assert.equal(call.body.messages[0].content[1].source.media_type, 'image/png')
  }
  for (const call of calls.slice(2)) {
    assert.equal(call.url, 'https://api.x.ai/v1/responses')
    assert.equal(call.headers.get('authorization'), 'Bearer xai-key')
    assert.equal(call.body.store, false)
    assert.equal(call.body.input[0].content[1].type, 'input_image')
  }
  legacy.configureRuntimeFetch(async () => Response.json({ stop_reason: 'max_tokens', content: [{ type: 'text', text: 'incomplete' }] }))
  await assert.rejects(legacy.callTextModel('anthropic', 'claude-fable-5-1', 'key', 'system', 'user'), /output limit/)
})

test('native image adapters honor their own generation/edit schemas and download assets without keys', async () => {
  const legacy = await loadLegacy()
  const calls: any[] = []
  legacy.configureRuntimeFetch(async (url, init) => {
    if (String(url) === 'https://assets.example/generated.png') {
      assert.equal(new Headers(init?.headers).get('authorization'), null)
      return new Response(Buffer.from(onePixelPngBase64, 'base64'))
    }
    const body = JSON.parse(String(init?.body))
    calls.push({ url: String(url), headers: new Headers(init?.headers), body })
    if (String(url).includes('siliconflow')) return Response.json({ images: [{ url: 'https://assets.example/generated.png' }] })
    if (String(url).includes('bigmodel')) return Response.json({ data: [{ url: 'https://assets.example/generated.png' }] })
    return Response.json({ data: [{ b64_json: onePixelPngBase64 }] })
  })
  const source = `data:image/png;base64,${onePixelPngBase64}`
  const cases = [
    ['xai', 'grok-imagine-image-2.0', '', '16:9', '2K'],
    ['xai', 'grok-imagine-image-2.0', source, '1:1', '1K'],
    ['recraft', 'recraftv4_1_pro', '', '16:9', '2K'],
    ['recraft', 'recraftv4_1', source, 'auto', '1K'],
    ['zhipu', 'glm-image', '', '16:9', '2K'],
    ['siliconflow', 'Qwen/Qwen-Image', '', '16:9', '1K'],
    ['siliconflow', 'Kwai-Kolors/Kolors', source, '3:4', '1K'],
  ]
  for (const [provider, model, input, ratio, resolution] of cases) {
    assert.equal(await legacy.callImageModel(provider, model, `${provider}-key`, 'diagram', ratio, input, resolution), onePixelPngBase64)
    assert.equal(calls.at(-1).headers.get('authorization'), `Bearer ${provider}-key`)
    assert.equal(calls.at(-1).body.model, model)
  }
  assert.equal(calls[0].body.resolution, '2k')
  assert.equal(calls[0].body.aspect_ratio, '16:9')
  assert.equal(calls[0].body.size, undefined)
  assert.equal(calls[1].url, 'https://api.x.ai/v1/images/edits')
  assert.deepEqual(calls[1].body.image, { url: source, type: 'image_url' })
  assert.equal(calls[2].body.size, '16:9')
  assert.equal(calls[3].url, 'https://external.api.recraft.ai/v1/images/imageToImage')
  assert.equal(calls[3].body.image_url, source)
  assert.equal(calls[3].body.strength, 0.5)
  assert.equal(calls[3].body.size, undefined)
  assert.equal(calls[4].body.size, '2048x1152')
  assert.equal(calls[5].body.image_size, '1664x928')
  assert.equal(calls[5].body.cfg, 4)
  assert.equal(calls[6].body.image, source)
  assert.equal(calls[6].body.image_size, '960x1280')
  const before = calls.length
  await assert.rejects(legacy.callImageModel('deepseek', 'deepseek-v4-pro', 'secret', 'draw', 'auto'), /does not support image generation/)
  await assert.rejects(legacy.callImageModel('zhipu', 'glm-image', 'key', 'edit', 'auto', source), /does not accept a source image/)
  await assert.rejects(legacy.callImageModel('xai', 'grok-imagine-image-2.0', 'key', 'draw', '1:4'), /Unsupported aspect ratio/)
  await assert.rejects(legacy.callImageModel('recraft', 'recraftv4_1', 'key', 'draw', 'auto', '', '4K', true), /does not support 4K/)
  assert.equal(calls.length, before)
})

test('Recraft native SVG requires its own image key and rejects unsafe or non-vector output', async () => {
  const legacy = await loadLegacy()
  const routes = { main: { accessProvider: 'deepseek', modelId: 'deepseek-v4-pro' }, image: { accessProvider: 'recraft', modelId: 'recraftv4_1_vector' }, vision: { accessProvider: 'kimi', modelId: 'kimi-k3' } }
  const roles = legacy.requiredCreateRouteRoles({ outputFormat: 'svg', taskName: 'diagram', modelRoutes: routes }, 0)
  assert.deepEqual(roles, ['main', 'image'])
  assert.deepEqual(legacy.selectRequiredRouteSecrets(routes, { deepseek: 'main-key', recraft: 'image-key', kimi: 'unused' }, roles), { deepseek: 'main-key', recraft: 'image-key' })
  const missingKey = await legacy.default({ request: { method: 'POST' }, body: { action: 'createJob', provider: 'deepseek', modelRoutes: routes, configurationMode: 'advanced', apiKeys: { deepseek: 'main-key' }, methodContent: 'A detailed method for the experimental workflow figure.', caption: 'Workflow', outputFormat: 'svg', maxCriticRounds: 0, retrievalSetting: 'none' }, response: { setHeader() {}, status() {} } })
  assert.equal(missingKey.code, 400)
  assert.match(missingKey.error, /Missing API key for provider recraft/)
  let output = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><path d="M0 0L64 64"/></svg>'
  let requests = 0
  legacy.configureRuntimeFetch(async (url, init) => {
    requests++
    assert.equal(String(url), 'https://external.api.recraft.ai/v1/images/generations')
    assert.equal(JSON.parse(String(init?.body)).model, 'recraftv4_1_vector')
    return Response.json({ data: [{ b64_json: Buffer.from(output).toString('base64') }] })
  })
  assert.equal(await legacy.callRecraftSvg('recraftv4_1_vector', 'key', 'diagram', '16:9'), output)
  output = '<svg><script>alert(1)</script></svg>'
  await assert.rejects(legacy.callRecraftSvg('recraftv4_1_vector', 'key', 'diagram', 'auto'), /script|unsafe|Unsupported/i)
  await assert.rejects(legacy.callRecraftSvg('recraftv4_1', 'key', 'diagram', 'auto'), /vector model/)
  assert.equal(requests, 2)
})

test('Recraft SVG jobs execute the image route, preserve SVG assets and never persist provider keys', async () => {
  const legacy = await loadLegacy()
  const state = (globalThis as any).__paperbananaLegacyTestState
  const previous = { inserts: state.inserts, updates: state.updates, ossWriteMode: state.ossWriteMode }
  state.inserts = []; state.updates = []; state.ossWriteMode = 'success'
  const calls: string[] = []
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><path d="M0 0L64 64"/></svg>'
  const routes = { main: { accessProvider: 'deepseek', modelId: 'deepseek-v4-pro' }, image: { accessProvider: 'recraft', modelId: 'recraftv4_1_vector' }, vision: { accessProvider: 'kimi', modelId: 'kimi-k3' } }
  legacy.configureRuntimeFetch(async (url, init) => {
    calls.push(String(url))
    if (String(url).includes('deepseek')) {
      assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer ds-secret')
      return Response.json({ choices: [{ message: { content: 'Two connected blocks describing the workflow.' } }] })
    }
    assert.equal(String(url), 'https://external.api.recraft.ai/v1/images/generations')
    assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer rc-secret')
    return Response.json({ data: [{ b64_json: Buffer.from(svg).toString('base64') }] })
  })
  try {
    for (const pipelineMode of ['planner_critic', 'vanilla']) {
      calls.length = 0
      const result = await legacy.default({ request: { method: 'POST' }, body: {
        action: 'createJob', userId: 'native-vector-owner', provider: 'deepseek', modelRoutes: routes, configurationMode: 'advanced',
        apiKeys: pipelineMode === 'vanilla' ? { recraft: 'rc-secret' } : { deepseek: 'ds-secret', recraft: 'rc-secret', kimi: 'unused-secret' },
        methodContent: 'A detailed method for the experimental workflow figure.', caption: 'Workflow',
        outputFormat: 'svg', pipelineMode, maxCriticRounds: 0, numCandidates: 1, retrievalSetting: 'none', aspectRatio: '16:9',
      }, headers: {}, response: { setHeader() {}, status() {} } })
      assert.equal(result.code, 0, JSON.stringify(result))
      await legacy.drainJobAdmission()
      const completion = state.updates.find((item: any) => item.query._id === result.jobId && item.update.$set?.status === 'succeeded')
      assert.ok(completion, JSON.stringify(state.updates).slice(-1000))
      assert.equal(completion.update.$set.resultImages[0].mimeType, 'image/svg+xml')
      assert.ok(completion.update.$set.resultImages[0].url)
      assert.deepEqual(calls, pipelineMode === 'vanilla' ? ['https://external.api.recraft.ai/v1/images/generations'] : ['https://api.deepseek.com/v1/chat/completions', 'https://external.api.recraft.ai/v1/images/generations'])
    }
    assert.doesNotMatch(JSON.stringify({ inserts: state.inserts, updates: state.updates }), /ds-secret|rc-secret|unused-secret|apiKeys|routeSecrets/)
  } finally {
    legacy.configureRuntimeFetch()
    Object.assign(state, previous)
  }
})

test('catalog repair: OpenAI generation and edit send the selected native dimensions', async () => {
  const legacy = await loadLegacy()
  const calls: Array<any> = []
  legacy.configureRuntimeFetch(async (_url, options) => {
    calls.push(options?.body instanceof FormData ? Object.fromEntries(options.body.entries()) : JSON.parse(String(options?.body)))
    return Response.json({ data: [{ b64_json: onePixelPngBase64 }] })
  })
  try {
    await legacy.callImageModel('openai', 'gpt-image-2', 'fixture-key', 'diagram', '3:2', '', '2K')
    await legacy.callImageModel('openai', 'gpt-image-2', 'fixture-key', 'diagram', '3:2', `data:image/png;base64,${onePixelPngBase64}`, '4K')
    assert.equal(calls[0].size, '2016x1344')
    assert.equal(calls[1].size, '3504x2336')
    for (const call of calls) {
      const [w, h] = call.size.split('x').map(Number)
      assert.equal(w / h, 1.5)
      assert.equal(w % 16, 0); assert.equal(h % 16, 0)
      assert.ok(w * h <= 8294400)
      assert.equal(call.output_format, 'png')
    }
  } finally { legacy.configureRuntimeFetch() }
})

test('catalog repair: old GPT-5 sampling is omitted for main and vision requests', async () => {
  const legacy = await loadLegacy()
  const calls: any[] = []
  legacy.configureRuntimeFetch(async (_url, options) => {
    calls.push(JSON.parse(String(options?.body)))
    return Response.json({ choices: [{ message: { content: 'done' } }] })
  })
  try {
    await legacy.callTextModel('openai', 'gpt-5-mini', 'fixture-key', 'system', 'user')
    await legacy.callVisionModel('openai', 'gpt-5-mini', 'fixture-key', 'method', 'caption', [{ url: 'https://example.com/ref.png', mimeType: 'image/png' }])
    for (const body of calls) for (const field of ['temperature', 'top_p', 'logprobs', 'reasoning_effort']) assert.equal(field in body, false)
  } finally { legacy.configureRuntimeFetch() }
})

test('catalog repair: Omni streams aggregate visible UTF-8 text and reject partial or error responses', async () => {
  const legacy = await loadLegacy()
  const good = 'data: {"choices":[{"index":0,"delta":{"reasoning_content":"private","content":"图"}}]}\r\n\r\ndata: {"choices":[{"index":0,"delta":{"content":"研"},"finish_reason":"stop"}]}\n\ndata: {"choices":[],"usage":{"total_tokens":4}}\n\ndata: [DONE]\n\n'
  let wire = good
  legacy.configureRuntimeFetch(async (_url, options) => {
    const body = JSON.parse(String(options?.body))
    assert.equal(body.stream, true)
    assert.deepEqual(body.modalities, ['text'])
    const bytes = Buffer.from(wire)
    return new Response(new ReadableStream({ start(controller) { for (const byte of bytes) controller.enqueue(Uint8Array.of(byte)); controller.close() } }), { headers: { 'Content-Type': 'text/event-stream' } })
  })
  try {
    assert.equal(await legacy.callTextModel('bailian', 'qwen3.5-omni-plus', 'fixture-key', 'system', 'user'), '图研')
    assert.equal(await legacy.callVisionModel('bailian', 'qwen3.5-omni-plus', 'fixture-key', 'method', 'caption', [{ url: 'https://example.com/ref.png', mimeType: 'image/png' }]), '图研')
    for (wire of ['data: {"choices":[{"delta":{"content":"partial"}}]}\n\n', 'data: {"error":{"message":"stream failed"}}\n\n', 'data: {bad json}\n\n']) {
      await assert.rejects(legacy.callTextModel('bailian', 'qwen3.5-omni-plus', 'fixture-key', 'system', 'user'))
    }
  } finally { legacy.configureRuntimeFetch() }
})

// v12 fixtures are synthetic. Every inference, task poll and asset read below
// is intercepted; none of these tests needs a provider account or API key.
test('catalog repair: every selectable static main and vision model dispatches its declared protocol and exact ID', async () => {
  const legacy = await loadLegacy()
  const catalogs: Array<{ provider: string; model: any }> = []
  for (const provider of ['deepseek', 'kimi', 'zhipu', 'siliconflow', 'anthropic', 'xai', 'gemini', 'bailian', 'openai', 'ark']) {
    const r = await legacy.default({ request: { method: 'POST' }, body: { action: 'modelRegistry', provider }, headers: {}, response: { setHeader() {}, status() {} } })
    for (const model of r.providers[provider].models) if (model.selectable) catalogs.push({ provider, model })
  }
  let current: any
  let requests = 0
  legacy.configureRuntimeFetch(async (input, init) => {
    const url = String(input)
    if (url === 'https://fixture.example/input.png') return new Response(Buffer.from(onePixelPngBase64, 'base64'), { headers: { 'content-type': 'image/png' } })
    requests++
    const body = JSON.parse(String(init?.body))
    const { provider, model } = current
    if (provider !== 'gemini') assert.equal(body.model, model.id, `${provider}: IDs must not migrate while still supported`)
    if (provider === 'gemini') {
      assert.ok(url.includes(`/models/${model.id}:generateContent`), url)
      return Response.json({ candidates: [{ content: { parts: [{ text: 'fixture-ok' }] } }] })
    }
    if (model.protocol === 'openai-responses') {
      assert.ok(url.endsWith('/responses'), url)
      assert.equal(body.store, false)
      assert.equal('temperature' in body, false)
      return Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: 'fixture-ok' }] }] })
    }
    if (provider === 'anthropic') {
      assert.ok(url.endsWith('/messages'), url)
      return Response.json({ content: [{ type: 'text', text: 'fixture-ok' }] })
    }
    assert.ok(url.endsWith('/chat/completions'), url)
    if (body.stream) return new Response('data: {"choices":[{"delta":{"content":"fixture-ok"},"finish_reason":null}]}\n\ndata: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n', { headers: { 'content-type': 'text/event-stream' } })
    return Response.json({ choices: [{ message: { content: 'fixture-ok' } }] })
  })
  try {
    for (current of catalogs) {
      if (current.model.roles.includes('main')) assert.equal(await legacy.callTextModel(current.provider, current.model.id, 'fixture-only', 'system', 'user'), 'fixture-ok', `${current.provider}/${current.model.id} main`)
      if (current.model.roles.includes('vision')) assert.equal(await legacy.callVisionModel(current.provider, current.model.id, 'fixture-only', 'method', 'caption', [{ url: 'https://fixture.example/input.png', mimeType: 'image/png' }]), 'fixture-ok', `${current.provider}/${current.model.id} vision`)
    }
    assert.ok(requests > 300, 'exercise the complete static role list')
  } finally { legacy.configureRuntimeFetch() }
})

test('catalog repair: OpenRouter unions text and image roles, preserves dates and blocks expired image dispatch', async () => {
  const legacy = await loadLegacy()
  const ids = ['fixture/dual', 'fixture/unsupported-image', 'fixture/expired', 'fixture/placeholder']
  const dates = ['2099-01-02', null, '2000-01-02', '2098-12-31']
  legacy.configureRuntimeFetch(async (input, init) => {
    assert.equal(init?.method === 'POST', false, 'no inference for expired image')
    if (String(input).endsWith('/api/v1/models')) return Response.json({ data: ids.map((id, i) => ({ id, expiration_date: dates[i], architecture: { input_modalities: ['text', 'image'], output_modalities: ['text'] } })) })
    if (String(input).endsWith('/images/models')) return Response.json({ data: ids.map((id, i) => ({ id, expiration_date: dates[i], architecture: { input_modalities: ['text', 'image'], output_modalities: ['image'] }, supported_parameters: i === 1 ? {} : { output_format: { values: ['png'] }, input_references: { max: 14 }, resolution: { values: ['1K', '2K'] } } })) })
    throw new Error(`unexpected URL ${input}`)
  })
  try {
    const r = await legacy.default({ request: { method: 'POST' }, body: { action: 'modelRegistry', provider: 'openrouter' }, headers: {}, response: { setHeader() {}, status() {} } })
    const models = new Map<string, any>(r.providers.openrouter.models.map((m: any) => [m.id, m]))
    const dual = models.get(ids[0])
    assert.deepEqual(dual.roles, ['main', 'vision', 'image'])
    assert.deepEqual(dual.roleProtocols, { main: 'openrouter-chat-completions', vision: 'openrouter-chat-completions', image: 'openrouter-images' })
    assert.equal(dual.expirationDate, dates[0])
    assert.equal(dual.capabilities.maxReferenceImages, 1)
    assert.equal(dual.capabilities.providerMaxReferenceImages, 14)
    assert.deepEqual(models.get(ids[1]).roles, ['main', 'vision'])
    assert.equal(models.get(ids[1]).selectable, true)
    assert.match(models.get(ids[1]).roleReasons.image, /output_format/)
    assert.equal(models.get(ids[2]), undefined)
    assert.equal(models.get(ids[3]).selectable, true)
    assert.equal(models.get(ids[3]).expirationDate, dates[3])
    assert.notEqual(r.providers.openrouter.defaults.main, ids[2])
    await assert.rejects(legacy.callImageModel('openrouter', ids[2], 'fixture-only', 'diagram', 'auto'), /expired on 2000-01-02/)
  } finally { legacy.configureRuntimeFetch() }
})

test('catalog repair: per-model OpenAI sampling and Responses completion contracts', async () => {
  const legacy = await loadLegacy()
  const bodies: any[] = []
  legacy.configureRuntimeFetch(async (input, init) => {
    bodies.push(JSON.parse(String(init?.body)))
    return String(input).endsWith('/responses') ? Response.json({ status: 'completed', output_text: 'ok' }) : Response.json({ choices: [{ message: { content: 'ok' } }] })
  })
  try {
    for (const id of ['gpt-5.1', 'gpt-5.2', 'gpt-4o-mini', 'gpt-5-mini', 'gpt-5.2-pro', 'gpt-5.3-codex']) await legacy.callTextModel('openai', id, 'fixture-only', 'system', 'user')
    for (const b of bodies.slice(0, 2)) { assert.equal(b.reasoning_effort, 'none'); assert.equal(typeof b.temperature, 'number') }
    assert.equal(typeof bodies[2].temperature, 'number')
    for (const b of bodies.slice(3)) for (const field of ['temperature', 'top_p', 'logprobs', 'reasoning_effort']) assert.equal(Object.hasOwn(b, field), false, `${b.model}/${field}`)
    legacy.configureRuntimeFetch(async () => Response.json({ status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' }, output_text: 'partial' }))
    await assert.rejects(legacy.callTextModel('openai', 'gpt-5.2-pro', 'fixture-only', 'system', 'user'), /incomplete.*max_output_tokens/)
  } finally { legacy.configureRuntimeFetch() }
})

test('catalog repair: every native image model dispatches generation or edit with its declared size profile', async () => {
  const legacy = await loadLegacy()
  const catalogs: Array<{ provider: string; model: any }> = []
  for (const provider of ['zhipu', 'siliconflow', 'recraft', 'xai', 'bailian']) {
    const r = await legacy.default({ request: { method: 'POST' }, body: { action: 'modelRegistry', provider }, headers: {}, response: { setHeader() {}, status() {} } })
    for (const model of r.providers[provider].models) if (model.selectable && model.roles.includes('image')) catalogs.push({ provider, model })
  }
  const state = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  const previous = { ossWriteMode: state.ossWriteMode, ossWrites: state.ossWrites }
  state.ossWriteMode = 'success'; state.ossWrites = []
  const previousWasm = process.env.RESVG_WASM_PATH
  process.env.RESVG_WASM_PATH = path.resolve(packageRoot, 'node_modules/@resvg/resvg-wasm/index_bg.wasm')
  const source = `data:image/png;base64,${onePixelPngBase64}`
  let current: any
  let editing = false
  let submissions = 0
  legacy.configureRuntimeFetch(async (input, init) => {
    const url = String(input)
    if (url === 'https://fixture.example/output.png') {
      assert.equal(new Headers(init?.headers).has('authorization'), false)
      return new Response(Buffer.from(onePixelPngBase64, 'base64'), { headers: { 'content-type': 'image/png' } })
    }
    if (url.includes('/api/v1/tasks/')) return Response.json({ output: { task_status: 'SUCCEEDED', results: [{ url: 'https://fixture.example/output.png' }] } })
    const body = JSON.parse(String(init?.body))
    assert.equal(body.model, current.model.id)
    submissions++
    const { provider, model } = current
    if (provider === 'bailian') {
      if (model.protocol === 'bailian-async-images') {
        assert.equal(new Headers(init?.headers).get('X-DashScope-Async'), 'enable')
        if (model.id === 'wan2.5-i2i-preview') { assert.ok(url.endsWith('/image2image/image-synthesis')); assert.equal(body.input.images.length, 1) }
        else if (model.id === 'wanx2.1-imageedit') { assert.ok(url.endsWith('/image2image/image-synthesis')); assert.equal(body.input.function, 'description_edit'); assert.equal('size' in body.parameters, false) }
        else if (model.id.startsWith('kling/') || model.id.startsWith('vidu/') || model.id === 'wan2.6-image') {
          assert.ok(url.endsWith('/image-generation/generation'))
          assert.equal(body.input.messages[0].content.some((x: any) => x.image), editing)
          if (model.id.startsWith('vidu/')) assert.match(body.parameters.size, /^\d+\*\d+$/)
          if (model.id.startsWith('kling/')) assert.match(body.parameters.resolution, /^[124]k$/)
          if (model.id === 'wan2.6-image') { assert.equal(body.parameters.enable_interleave, !editing); if (!editing) assert.equal(body.parameters.max_images, 1) }
        } else { assert.ok(url.endsWith('/text2image/image-synthesis')); assert.match(body.parameters.size, /^\d+\*\d+$/) }
        assert.equal(body.parameters.n, 1)
        return Response.json({ output: { task_id: 'fixture-task' } })
      }
      assert.ok(url.endsWith('/multimodal-generation/generation'))
      return Response.json({ output: { choices: [{ message: { content: [{ image: 'https://fixture.example/output.png' }] } }] } })
    }
    if (provider === 'siliconflow') {
      if (model.id.startsWith('Qwen/Qwen-Image-Edit')) { assert.equal('image_size' in body, false); assert.ok(body.image) }
      else assert.match(body.image_size, /^\d+x\d+$/)
      return Response.json({ images: [{ b64_json: onePixelPngBase64 }] })
    }
    if (provider === 'recraft') {
      assert.ok(url.endsWith(editing ? '/imageToImage' : '/generations'))
      if (editing) { assert.equal('size' in body, false); assert.ok(body.image_url) }
      if (model.id.endsWith('_vector')) return Response.json({ data: [{ b64_json: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="red"/></svg>').toString('base64') }] })
    }
    if (provider === 'zhipu') {
      const [w, h] = body.size.split('x').map(Number)
      const alignment = model.id === 'glm-image' ? 32 : 16
      assert.equal(w % alignment, 0); assert.equal(h % alignment, 0)
      assert.ok(w * h <= (model.id === 'glm-image' ? 4194304 : 2097152))
    }
    if (provider === 'xai') { assert.ok(url.endsWith(editing ? '/edits' : '/generations')); assert.equal('quality' in body, false) }
    return Response.json({ data: [{ b64_json: onePixelPngBase64 }] })
  })
  try {
    for (current of catalogs) {
      const cap = current.model.capabilities
      if (!cap.requiresSourceImage) {
        editing = false
        await legacy.callImageModel(current.provider, current.model.id, 'fixture-only', 'diagram', cap.aspectRatios[0] || 'auto', '', cap.resolutions.at(-1) || 'auto', true)
      } else await assert.rejects(legacy.callImageModel(current.provider, current.model.id, 'fixture-only', 'diagram', 'auto'), /requires a source image/)
      if (cap.imageEditing) {
        editing = true
        await legacy.callImageModel(current.provider, current.model.id, 'fixture-only', 'edit diagram', cap.refineAspectRatios[0] || 'auto', source, cap.refineResolutions.at(-1) || 'auto', true)
      }
    }
    assert.ok(submissions > 90, 'exercise all native image generations and edits')
    await assert.rejects(legacy.callImageModel('recraft', 'recraftv2', 'fixture-only', 'edit', 'auto', source), /does not accept a source image/)
    await assert.rejects(legacy.callImageModel('recraft', 'recraftv3', 'fixture-only', 'x'.repeat(1001), 'auto'), /exceeds 1000/)
  } finally { legacy.configureRuntimeFetch(); Object.assign(state, previous); if (previousWasm === undefined) delete process.env.RESVG_WASM_PATH; else process.env.RESVG_WASM_PATH = previousWasm }
})

test('catalog repair: Bailian tasks poll without resubmission and fail on terminal states or missing images', async () => {
  const legacy = await loadLegacy()
  try {
    let index = 0
    legacy.configureRuntimeFetch(async (_url, init) => {
      assert.equal(init?.method, 'GET')
      return Response.json({ output: { task_status: ['PENDING', 'RUNNING', 'SUCCEEDED'][index++] } })
    })
    assert.equal((await legacy.pollBailianImageTask('fixture-task', 'fixture-only', { intervalMs: 0, timeoutMs: 1000 })).output.task_status, 'SUCCEEDED')
    assert.equal(index, 3)
    for (const state of ['FAILED', 'CANCELED', 'UNKNOWN', undefined]) {
      legacy.configureRuntimeFetch(async () => Response.json({ output: { task_status: state, message: 'fixture failure' } }))
      await assert.rejects(legacy.pollBailianImageTask('fixture-task', 'fixture-only', { intervalMs: 0, timeoutMs: 1000 }), /fixture failure/)
    }
    legacy.configureRuntimeFetch(async () => Response.json({ output: { task_status: 'RUNNING' } }))
    await assert.rejects(legacy.pollBailianImageTask('fixture-task', 'fixture-only', { intervalMs: 0, timeoutMs: 5 }), /timed out; do not submit a duplicate/)
    let posts = 0
    legacy.configureRuntimeFetch(async (_url, init) => { if (init?.method === 'POST') posts++; return new Response('fixture failure', { status: 503 }) })
    await assert.rejects(legacy.callImageModel('bailian', 'wan2.2-t2i-plus', 'fixture-only', 'diagram', 'auto'), /fixture failure/)
    assert.equal(posts, 1, 'a failed POST must not create duplicate paid jobs')
    legacy.configureRuntimeFetch(async () => Response.json({ output: {} }))
    await assert.rejects(legacy.callImageModel('bailian', 'wan2.2-t2i-plus', 'fixture-only', 'diagram', 'auto'), /valid task ID/)
    legacy.configureRuntimeFetch(async (_url, init) => Response.json({ output: init?.method === 'POST' ? { task_id: 'fixture-task' } : { task_status: 'SUCCEEDED', results: [] } }))
    await assert.rejects(legacy.callImageModel('bailian', 'wan2.2-t2i-plus', 'fixture-only', 'diagram', 'auto'), /succeeded without an image/)
  } finally { legacy.configureRuntimeFetch() }
})

test('catalog repair: Vidu families use documented pixel tables and keep unsupported tiers closed', async () => {
  const legacy = await loadLegacy()
  const bodies: any[] = []
  legacy.configureRuntimeFetch(async (input, init) => {
    if (init?.method === 'POST') { bodies.push(JSON.parse(String(init.body))); return Response.json({ output: { task_id: 'fixture-task' } }) }
    if (String(input).includes('/tasks/')) return Response.json({ output: { task_status: 'SUCCEEDED', choices: [{ message: { content: [{ image: 'https://fixture.example/image.png' }] } }] } })
    assert.equal(new Headers(init?.headers).has('authorization'), false)
    return new Response(Buffer.from(onePixelPngBase64, 'base64'), { headers: { 'content-type': 'image/png' } })
  })
  try {
    for (const [id, tier, ratio, expected] of [
      ['vidu/vidu-image_reference2image', '4K', '16:9', '3840*2160'],
      ['vidu/vidu-image-pro_reference2image', '2K', '4:3', '2736*2048'],
      ['vidu/vidu-image-lite_reference2image', '1K', '9:16', '1088*1920'],
      ['vidu/viduq3-fast_reference2image', '4K', '1:8', '1408*11712'],
      ['vidu/viduq2-pro_reference2image', '4K', '16:9', '5504*3072'],
      ['vidu/viduq2-fast_reference2image', '1K', '21:9', '1584*672'],
    ]) {
      await legacy.callImageModel('bailian', id, 'fixture-only', 'diagram', ratio, '', tier, true)
      assert.equal(bodies.at(-1).parameters.size, expected, `${id}/${tier}/${ratio}`)
    }
    await assert.rejects(legacy.callImageModel('bailian', 'vidu/viduq2-fast_reference2image', 'fixture-only', 'diagram', 'auto', '', '4K', true), /does not support 4K/)
    assert.equal(bodies.length, 6)
  } finally { legacy.configureRuntimeFetch() }
})

test('catalog repair: Gemini 512 and native-size edit values reach the provider unchanged', async () => {
  const legacy = await loadLegacy()
  const bodies: any[] = []
  legacy.configureRuntimeFetch(async (_input, init) => {
    bodies.push(JSON.parse(String(init?.body)))
    return bodies.at(-1).model.startsWith('gemini') ? Response.json({ output_image: { data: onePixelPngBase64, mime_type: 'image/png' } }) : Response.json({ data: [{ b64_json: onePixelPngBase64 }] })
  })
  try {
    await legacy.callImageModel('gemini', 'gemini-3.1-flash-image', 'fixture-only', 'diagram', '1:8', '', '512', true)
    assert.equal(bodies[0].response_format.image_size, '512')
    assert.equal(bodies[0].response_format.aspect_ratio, '1:8')
    await legacy.callImageModel('recraft', 'recraftv4_1', 'fixture-only', 'edit', 'auto', `data:image/png;base64,${onePixelPngBase64}`, 'auto', true)
    assert.equal(Object.hasOwn(bodies[1], 'size'), false, 'imageToImage inherits the source size')
  } finally { legacy.configureRuntimeFetch() }
})

test('channel extensions: runtime dispatches every new selectable image option using the reviewed wire contract', async (t) => {
  const legacy=await loadLegacy()
  const extensions=JSON.parse(fs.readFileSync(path.resolve(packageRoot,'../../config/model-catalog-updates.json'),'utf8')).channels
  const raster=(await sharp({create:{width:64,height:64,channels:3,background:'#fff'}}).png().toBuffer()).toString('base64')
  const calls:Array<{url:string;body:any;headers:Headers}>=[]
  legacy.configureRuntimeFetch(async(input,init)=>{
    const url=String(input),headers=new Headers(init?.headers)
    const body=init?.body instanceof FormData?Object.fromEntries(init.body.entries()):init?.body?JSON.parse(String(init.body)):undefined
    calls.push({url,body,headers})
    if(url.startsWith('https://asset.invalid/')){assert.equal(headers.has('Authorization'),false);assert.equal(headers.has('x-key'),false);return new Response(Buffer.from(raster,'base64'),{headers:{'Content-Type':'image/png'}})}
    if(url.includes('/chat/completions'))return Response.json({choices:[{message:{content:'A scientific diagram.'},finish_reason:'stop'}]})
    if(url.startsWith('https://api.bfl.ai/v1/'))return Response.json({id:'fixture',polling_url:'https://api.us1.bfl.ai/v1/get_result?id=fixture'})
    if(url.startsWith('https://api.us1.bfl.ai/'))return Response.json({status:'Ready',result:{sample:'https://asset.invalid/output.png'}})
    if(url.startsWith('https://queue.fal.run/'))return Response.json(init?.method==='POST'?{status:'IN_QUEUE',request_id:'fixture',status_url:'https://queue.fal.run/fal-ai/flux-2-pro/requests/fixture/status',response_url:'https://queue.fal.run/fal-ai/flux-2-pro/requests/fixture'}:url.endsWith('/status')?{status:'COMPLETED'}:{images:[{url:'https://asset.invalid/output.png'}]})
    if(url.startsWith('https://api.replicate.com/'))return Response.json(init?.method==='POST'?{status:'starting',urls:{get:'https://api.replicate.com/v1/predictions/fixture'}}:{status:'succeeded',output:'https://asset.invalid/output.png'})
    if(url.startsWith('https://api.stability.ai/'))return Response.json({finish_reason:'SUCCESS',image:raster})
    if(/^https:\/\/api\.minimax\.(io|cn)\/v1\/image_generation/.test(url))return Response.json({base_resp:{status_code:0},data:{image_base64:[raster]}})
    if(url.startsWith('https://api.ideogram.ai/'))return Response.json({data:[{url:'https://asset.invalid/output.png',is_image_safe:true}]})
    if(url.startsWith('https://api.together.ai/v1/images'))return Response.json({data:[{b64_json:raster}]})
    throw new Error(`Unexpected extension endpoint: ${url}`)
  })
  let combinations=0
  try {
    for(const provider of Object.keys(extensions)) {
      const registry=await legacy.default({request:{method:'POST'},body:{action:'modelRegistry',provider},headers:{},response:{setHeader(){},status(){}}})
      assert.equal(registry.code,0,provider)
      for(const model of registry.providers[provider].models) {
        if(!model.selectable)continue
        const region = provider==='minimax' && model.regions?.includes('cn') && !model.regions?.includes('global') ? 'cn' : 'global'
        for(const role of model.roles.filter((role:string)=>role!=='image')) {
          const start=calls.length
          if(role==='main')await legacy.callTextModel(provider,model.id,'extension-fixture-secret','system','plan a figure')
          else await legacy.callVisionModel(provider,model.id,'extension-fixture-secret','describe figure','caption',[{url:`data:image/png;base64,${raster}`,mimeType:'image/png',base64:raster}])
          const call=calls.slice(start).find(call=>call.url.endsWith('/chat/completions'))!
          assert.ok(call,`${provider}/${model.id}/${role}`);assert.equal(call.body.model,model.id)
          assert.equal(call.headers.get('Authorization'),'Bearer extension-fixture-secret')
          if(provider==='minimax')assert.equal(call.body.reasoning_split,true)
        }
        if(!model.roles.includes('image'))continue
        for(const editing of [false,true]) {
          if(editing&&model.capabilities.imageEditMode!=='direct-edit')continue
          const maps=model.capabilities[editing?'refineAspectRatiosByResolution':'aspectRatiosByResolution']
          for(const [resolution,ratios] of Object.entries(maps) as Array<[string,string[]]>) for(const ratio of ['auto',...ratios]) {
            const start=calls.length
            const image=await legacy.callImageModel(provider,model.id,'extension-fixture-secret','scientific figure',ratio,editing?'https://asset.invalid/source.png':'',resolution,true,region)
            assert.ok(image);combinations++
            const api=calls.slice(start).find(call=>call.body)!
            assert.ok(api,`${provider}/${model.id}/${ratio}`)
            // Independent schema and size-boundary tests cover each wire field. This
            // integration loop checks that every advertised selection reaches an adapted
            // endpoint through the actual backend (including region and source plumbing).
            if (provider==='minimax') {
              assert.equal(api.url, `https://api.minimax.${region==='cn'?'cn':'io'}/v1/image_generation`)
              if(model.id==='image-01-live') { assert.equal(api.body.width,undefined); assert.ok(api.body.aspect_ratio) }
              else { assert.ok(api.body.width>=512 && api.body.width<=2048); assert.equal(api.body.width%8,0) }
            }
            if(provider==='stability' && model.id.startsWith('sd3.5-')) {
              assert.equal(api.body.model,model.id)
              assert.equal(api.body.mode,editing?'image-to-image':'text-to-image')
              if(editing)assert.equal(api.body.aspect_ratio,undefined)
            }
            if(provider==='replicate')assert.ok(api.body.input.prompt || api.body.input.instruction)

          }
        }
      }
    }
    t.diagnostic(`${combinations} extension selections dispatched through the backend`)
    assert.ok(combinations>500,`only ${combinations} extension combinations exercised`)
    const before=calls.length
    await assert.rejects(legacy.callImageModel('ideogram','ideogram-v4','key','figure','9:22','','1K',true),/Unsupported image size combination/)
    await assert.rejects(legacy.callImageModel('bfl','flux-2-pro','key','figure','1:1','','4K',true),/does not support 4K/)
    assert.equal(calls.length,before,'invalid combinations must never reach transport')
  } finally {legacy.configureRuntimeFetch()}
})

test('Bailian scheduled retirement follows the official Beijing midnight boundary', async () => {
  const legacy = await loadLegacy()
  const now = Date.now
  const inspect = async () => {
    const result = await legacy.default({ request: { method: 'POST' }, body: { action: 'modelRegistry', provider: 'bailian' }, headers: {}, response: { setHeader() {}, status() {} } })
    return result.providers.bailian.models.find((model: any) => model.id === 'qwen-turbo')
  }
  try {
    Date.now = () => Date.parse('2026-10-09T15:59:59.999Z')
    assert.equal((await inspect()).selectable, true)
    Date.now = () => Date.parse('2026-10-09T16:00:00Z')
    const retired = await inspect()
    assert.equal(retired, undefined)
  } finally { Date.now = now }
})

test('xAI normalizes WebP references to supported PNG for planning, vision and image editing', async () => {
  const legacy = await loadLegacy()
  const images = [{ url: `data:image/webp;base64,${onePixelWebpBase64}`, mimeType: 'image/webp' }]
  const bodies: any[] = []
  legacy.configureRuntimeFetch(async (input, init) => {
    const body = JSON.parse(String(init?.body)); bodies.push(body)
    assert.ok(String(input).startsWith('https://api.x.ai/'))
    return String(input).endsWith('/responses') ? Response.json({ output_text: 'fixture-ok' }) : Response.json({ data: [{ b64_json: onePixelPngBase64 }] })
  })
  try {
    await legacy.callTextModel('xai', 'grok-build-0.1', 'fixture', 'system', 'describe', images)
    await legacy.callVisionModel('xai', 'grok-4.6', 'fixture', 'method', 'caption', images)
    await legacy.callImageModel('xai', 'grok-imagine-image-quality', 'fixture', 'edit figure', '1:1', images[0].url, '1K', true)
    for (const body of bodies) {
      const url = body.image?.url || body.input[0].content[1].image_url
      assert.match(url, /^data:image\/png;base64,/)
      const bytes = Buffer.from(url.split(',')[1], 'base64')
      assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', body.model)
      // Core deliberately enables only the WebP input decoder in sharp;
      // verify the encoded PNG header without changing that global policy.
      assert.equal(bytes.readUInt32BE(16), 1)
      assert.equal(bytes.readUInt32BE(20), 1)
    }
    assert.equal(bodies.length, 3)
  } finally { legacy.configureRuntimeFetch() }
})

test('reviewed OpenRouter public catalog accounts for every model at its snapshot date and exposes only compatible selections', async (t) => {
  const snapshot = JSON.parse(fs.readFileSync(path.resolve(packageRoot, '../../config/openrouter-catalog-review.json'), 'utf8'))
  // This fixture describes its review date, not today's live directory. Keep
  // scheduled retirements from turning an unchanged historical audit red.
  const reviewedAt = Date.parse(`${snapshot.reviewedAt}T12:00:00Z`)
  assert.ok(Number.isFinite(reviewedAt))
  t.mock.method(Date, 'now', () => reviewedAt)
  const legacy = await loadLegacy()
  const imageCards = new Map<string, any>(snapshot.images.map((model: any) => [model.id, model]))
  let submissions = 0
  legacy.configureRuntimeFetch(async (input, init) => {
    const url = String(input)
    if (url.endsWith('/images/models')) return Response.json({ data: snapshot.images })
    if (url.endsWith('/api/v1/models')) return Response.json({ data: snapshot.text })
    assert.equal(url, 'https://openrouter.ai/api/v1/images')
    const body = JSON.parse(String(init?.body))
    const card = imageCards.get(body.model)
    assert.ok(card, body.model)
    const parameters = card.supported_parameters || {}
    for (const key of ['resolution', 'aspect_ratio', 'output_format']) {
      if (body[key] !== undefined) assert.ok(parameters[key]?.values?.includes(body[key]), `${body.model}/${key}: ${body[key]}`)
    }
    if (body.input_references) assert.ok(parameters.input_references, body.model + ' editing')
    submissions++
    return Response.json({ data: [{ b64_json: onePixelPngBase64 }] })
  })
  try {
    const result = await legacy.default({ request: { method: 'POST' }, body: { action: 'modelRegistry', provider: 'openrouter' }, headers: {}, response: { setHeader() {}, status() {} } })
    assert.equal(result.code, 0)
    const registry = result.providers.openrouter
    const expected = new Set([...snapshot.text, ...snapshot.images].map((model: any) => model.id))
    assert.equal(expected.size, 473)
    for (const id of ['meta/muse-image', 'recraft/recraft-v4-styles', 'recraft/recraft-v4-styles-pro', 'recraft/recraft-v4-styles-vector', 'recraft/recraft-v4-styles-pro-vector']) expected.delete(id)
    assert.equal(expected.size, 468)
    assert.deepEqual(new Set(registry.models.map((model: any) => model.id)), expected)
    for (const model of registry.models) {
      if (!model.selectable) assert.ok(model.disabledReason, model.id + ' needs a reason')
      if (!model.selectable || !model.roles.includes('image')) continue
      for (const editing of [false, true]) {
        if (editing && !model.capabilities.imageEditing) continue
        const resolutions = model.capabilities[editing ? 'refineResolutions' : 'resolutions'] || []
        const ratios = model.capabilities[editing ? 'refineAspectRatios' : 'aspectRatios'] || []
        for (const resolution of resolutions.length ? resolutions : ['auto']) for (const ratio of ['auto', ...ratios]) {
          await legacy.callImageModel('openrouter', model.id, 'fixture-only', 'Scientific figure', ratio, editing ? `data:image/png;base64,${onePixelPngBase64}` : '', resolution, resolution !== 'auto')
        }
      }
    }
    const imageModels = registry.models.filter((model: any) => model.selectable && model.roles.includes('image')).length
    t.diagnostic(`${registry.models.length} catalog IDs; ${imageModels} adapted image models; ${submissions} legal image requests`)
    // Optional local audit capture; ordinary tests do not modify repository files.
    if (process.env.TUYAN_CATALOG_REVIEW_OUTPUT) fs.writeFileSync(process.env.TUYAN_CATALOG_REVIEW_OUTPUT, JSON.stringify(registry, null, 2) + '\n')
  } finally { legacy.configureRuntimeFetch() }
})

test('per-resolution combinations reject before account lookup, credentials or persistence', async () => {
  const legacy = await loadLegacy()
  const state = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  const previousInserts = state.inserts, previousQueries = state.accountDeletionFindQueries
  state.inserts = []; state.accountDeletionFindQueries = []
  let calls = 0
  legacy.configureRuntimeFetch(async () => { calls++; throw new Error('unexpected dispatch') })
  const shared = { provider:'openai',configurationMode:'advanced', userId:'fixture-owner', apiKeys:{}, imageSize:'1K', aspectRatio:'9:22',
    modelRoutes: { main:{accessProvider:'openai',modelId:'gpt-5.6-sol'}, image:{accessProvider:'ideogram',modelId:'ideogram-v4'}, vision:{accessProvider:'openai',modelId:'gpt-5.6-sol'} } }
  const invoke = (body:any) => legacy.default({request:{method:'POST'},body,headers:{},response:{setHeader(){},status(){}}})
  try {
    const create = await invoke({...shared, action:'createJob',methodContent:'A sufficiently detailed method section for image size validation.',caption:'A scientific diagram.',outputFormat:'png',pipelineMode:'vanilla'})
    const refine = await invoke({...shared, action:'refineImage',sourceImageObjectKey:'owned/fixture.png',editInstruction:'Improve the labels.'})
    assert.equal(create.code,400); assert.equal(create.businessCode,'IMAGE_SIZE_UNSUPPORTED')
    assert.equal(refine.code,400); assert.equal(refine.businessCode,'REFINE_IMAGE_SIZE_UNSUPPORTED')
    assert.equal(state.inserts.length,0); assert.equal(state.accountDeletionFindQueries.length,0); assert.equal(calls,0)
  } finally { legacy.configureRuntimeFetch(); state.inserts=previousInserts; state.accountDeletionFindQueries=previousQueries }
})

test('refine admission preserves 512 and native-size requests through persistence and API dispatch', async () => {
  const legacy = await loadLegacy()
  const state = ((globalThis as any).__paperbananaLegacyTestState ||= {})
  const previous = { writes:state.ossWriteMode, stored:state.storedObjectBytes, inserts:state.inserts }
  state.ossWriteMode='success'; state.storedObjectBytes={'owned/size-fixture.png':Buffer.from(onePixelPngBase64,'base64')};state.inserts=[]
  const calls:Array<{url:string;body:any}>=[]
  legacy.configureRuntimeFetch(async (input,init) => {
    const url=String(input), body=typeof init?.body==='string'?JSON.parse(init.body):undefined
    calls.push({url,body})
    if(url.includes('generativelanguage.googleapis.com')) return Response.json({output_image:{data:onePixelPngBase64,mime_type:'image/png'}})
    if(url.includes('external.api.recraft.ai')) return Response.json({data:[{b64_json:onePixelPngBase64}]})
    throw new Error(`Unexpected native-size dispatch ${url}`)
  })
  try {
    for(const [provider,model,imageSize] of [['gemini','gemini-3.1-flash-image','512'],['recraft','recraftv4_1','auto']]) {
      const result=await legacy.default({request:{method:'POST'},body:{action:'refineImage',provider:'openai',configurationMode:'advanced',apiKeys:{[provider]:'fixture-only'},aspectRatio:'auto',imageSize,sourceImageObjectKey:'owned/size-fixture.png',editInstruction:'Improve label clarity.',modelRoutes:{main:{accessProvider:'openai',modelId:'gpt-5.6-sol'},image:{accessProvider:provider,modelId:model},vision:{accessProvider:'openai',modelId:'gpt-5.6-sol'}}},headers:{},response:{setHeader(){},status(){}}})
      assert.equal(result.code,0,JSON.stringify(result));await legacy.drainJobAdmission()
      assert.equal(state.inserts.at(-1).imageSize,imageSize)
    }
    assert.equal(calls.find(call=>call.url.includes('generativelanguage.googleapis.com'))?.body.response_format.image_size,'512')
    assert.equal(Object.hasOwn(calls.find(call=>call.url.includes('external.api.recraft.ai'))!.body,'size'),false)
  } finally {legacy.configureRuntimeFetch();state.ossWriteMode=previous.writes;state.storedObjectBytes=previous.stored;state.inserts=previous.inserts;state.deletedOwnerKeys=[]}
})


test('MiniMax regions survive routing and execution snapshots and reject incompatible regional models before fetch', async()=>{
 const legacy=await loadLegacy()
 const modelRoutes={main:{accessProvider:'minimax',modelId:'MiniMax-M3'},vision:{accessProvider:'minimax',modelId:'MiniMax-M3'},image:{accessProvider:'minimax',modelId:'image-01-live'}}
 const routing=legacy.resolveModelRouting({provider:'minimax',modelRoutes,providerRegions:{minimax:'cn'}})
 assert.deepEqual(routing.providerRegions,{minimax:'cn'})
 for(const snapshot of [legacy.toCreateExecutionBody({...routing,apiKeys:{minimax:'never-persist'}}),legacy.toRefineExecutionBody({...routing,apiKeys:{minimax:'never-persist'}})]){
  assert.deepEqual(snapshot.providerRegions,{minimax:'cn'});assert.equal('apiKeys' in snapshot,false)
 }
 assert.throws(()=>legacy.resolveModelRouting({provider:'minimax',modelRoutes}),/unavailable/)
 assert.throws(()=>legacy.resolveModelRouting({provider:'minimax',modelRoutes,providerRegions:{minimax:'elsewhere'}}),/Invalid provider region/)
 const calls:Array<{url:string;key:string}>=[]
 legacy.configureRuntimeFetch(async(input,init)=>{
  const url=String(input),key=new Headers(init?.headers).get('authorization')||'';calls.push({url,key})
  assert.equal(key,url.includes('minimax.cn')?'Bearer cn-fixture':'Bearer global-fixture')
  return url.endsWith('/image_generation')?Response.json({base_resp:{status_code:0},data:{image_base64:[onePixelPngBase64]}}):Response.json({choices:[{message:{content:'Plan'}}]})
 })
 try {
  await Promise.all((['cn','global'] as const).flatMap(region=>[
   legacy.callTextModel('minimax','MiniMax-M3',region+'-fixture','system','figure',[],{region}),
   legacy.callVisionModel('minimax','MiniMax-M3',region+'-fixture','figure','caption',[{url:'data:image/png;base64,'+onePixelPngBase64,mimeType:'image/png'}],region),
   legacy.callImageModel('minimax','image-01',region+'-fixture','figure','16:9','','1K',true,region),
  ]))
  assert.equal(calls.filter(x=>x.url.includes('minimax.cn')).length,3);assert.equal(calls.filter(x=>x.url.includes('minimax.io')).length,3)
  const before=calls.length
  await assert.rejects(legacy.callImageModel('minimax','image-01-live','global-fixture','figure','1:1','','1K',true,'global'),/unavailable/)
  await assert.rejects(legacy.callImageModel('minimax','image-01-live','cn-fixture','figure','21:9','','1K',true,'cn'),/Unsupported (image size|aspect ratio)/)
  assert.equal(calls.length,before)
 } finally {legacy.configureRuntimeFetch()}
})
