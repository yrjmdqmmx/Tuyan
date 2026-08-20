import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { build } from 'esbuild'

const onePixelPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+VP5TAAAAAElFTkSuQmCC'

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
  callTextModel(provider: string, model: string, apiKey: string, system: string, user: string, images?: Array<Record<string, string>>): Promise<string>
  callVisionModel(provider: string, model: string, apiKey: string, methodContent: string, caption: string, images: Array<Record<string, string>>): Promise<string>
  callImageModel(provider: string, model: string, apiKey: string, prompt: string, aspectRatio: string, sourceImage?: string, imageSize?: string, strictImageSize?: boolean): Promise<string>
  normalizeModelName(provider: string, model: string): string
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
    external: ['@resvg/resvg-wasm', 'ali-oss', 'express', 'mongodb'],
  })
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
    const incompatible = await invoke('qwen3.8-max', 1)
    assert.equal(incompatible.code, 400)
    assert.match(incompatible.error, /qwen3\.8-max is not registered for vision/)
    assert.equal(state.inserts.length, 0)

    const compatible = await invoke('qwen3.7-plus', 1)
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
    const incompatible = await invoke('qwen3.8-max')
    assert.equal(incompatible.code, 400)
    assert.match(incompatible.error, /qwen3\.8-max is not registered for vision/)
    assert.equal(state.inserts.length, 0)

    const compatible = await invoke('qwen3.7-plus')
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
  assert.match(candidate, /modelRouteAccess\(body, routeSecrets, 'main'\)/)
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
    assert.match(source, /callImageModel\(imageRoute\.provider, imageRoute\.model, imageRoute\.apiKey, editPrompt, body\.aspectRatio \|\| '16:9', sourceUrl, body\.imageSize \|\| '2K', true\)/)
    assert.match(source, /callImageModel\(imageRoute\.provider, imageRoute\.model, imageRoute\.apiKey, diagramPromptFromDescription\(description\), body\.aspectRatio \|\| '16:9', '', body\.imageSize \|\| '2K', true\)/)
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
    assert.equal(render?.body.parameters.size, '1360*768')
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
      assert.deepEqual(result, { code: 400, error: 'Invalid imageSize. Must be 1K, 2K, or 4K.' }, String(imageSize))
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
        image: { accessProvider: 'openai', modelId: 'gpt-image-2' },
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
      [openai, 'openai/gpt-image-2', '2K'],
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
  assert.match(gemini.registryVersion, /^2026-08-/)
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
  assert.deepEqual(geminiModels.get('gemini-3.1-flash-image')?.capabilities.resolutions, ['1K', '2K', '4K'])
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
  for (const current of ['qwen3.8-max', 'qwen3.8-max-preview', 'qwen3.7-plus', 'qwen3.7-flash', 'glm-5.2', 'kimi/kimi-k3', 'MiniMax/MiniMax-M3', 'qwen-image-3.0-pro', 'qwen-image-2.0-pro', 'qwen-image-2.0', 'z-image-turbo']) {
    assert.equal(bailianModels.has(current), true, current)
  }
  for (const retired of ['qwen3.7-max', 'qwen3.6-flash', 'glm-5.1', 'kimi-k2.6', 'MiniMax/MiniMax-M2.7', 'qwen-image-3.0']) {
    assert.equal(bailianModels.has(retired), false, retired)
  }
  assert.deepEqual(bailianModels.get('qwen3.8-max')?.roles, ['main'])
  assert.deepEqual(bailianModels.get('qwen3.8-max-preview')?.roles, ['main'])
  assert.deepEqual(bailianModels.get('qwen3.7-plus')?.roles, ['main', 'vision'])
  assert.deepEqual(bailianModels.get('qwen3.7-flash')?.roles, ['main', 'vision'])
  assert.deepEqual(bailianModels.get('MiniMax/MiniMax-M3')?.roles, ['main', 'vision'])
  assert.equal(bailianModels.get('qwen3.8-max-preview')?.requiresEntitlement, true)
  assert.equal(bailianModels.get('qwen3.8-max-preview')?.entitlement, 'token-plan')
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

  const openaiOrdered = openai.providers.openai.models
  assert.deepEqual(openaiOrdered.slice(0, 3).map((model: any) => [model.id, model.releasedAt]), [
    ['gpt-5.6-sol', '2026-07-09'],
    ['gpt-5.6-terra', '2026-07-09'],
    ['gpt-5.6-luna', '2026-07-09'],
  ])
  const firstUnknownOpenAiRelease = openaiOrdered.findIndex((model: any) => model.releasedAt === null)
  assert.ok(firstUnknownOpenAiRelease >= 3)
  assert.equal(openaiOrdered.slice(firstUnknownOpenAiRelease).every((model: any) => model.releasedAt === null), true)

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
  assert.deepEqual([...arkModels.keys()], [
    'doubao-seed-2-1-pro-260628',
    'doubao-seed-2-1-turbo-260628',
    'doubao-seed-evolving',
    'doubao-seed-2-0-lite-260428',
    'doubao-seed-2-0-mini-260428',
    'doubao-seed-2-0-pro-260215',
    'doubao-seed-2-0-lite-260215',
    'doubao-seed-2-0-mini-260215',
    'doubao-seed-2-0-code-preview-260215',
    'doubao-seed-character-260628',
    'doubao-seed-character-251128',
    'doubao-seed-translation-250915',
    'glm-5-2-260617',
    'deepseek-v4-pro-ga-260813',
    'deepseek-v4-flash-ga-260731',
    'deepseek-v4-pro-260425',
    'deepseek-v4-flash-260425',
    'doubao-seedream-5-0-pro-260628',
    'doubao-seedream-5-0-260128',
    'doubao-seedream-4-5-251128',
    'doubao-seedream-4-0-250828',
  ])
  assert.deepEqual(arkModels.get('doubao-seed-2-1-pro-260628')?.roles, ['main', 'vision'])
  assert.equal(arkModels.get('doubao-seed-2-1-pro-260628')?.recommended, true)
  assert.equal(arkModels.get('doubao-seed-evolving')?.lifecycle, 'unknown')
  assert.equal(arkModels.get('doubao-seed-2-0-code-preview-260215')?.lifecycle, 'preview')
  assert.equal(arkModels.get('doubao-seed-character-260628')?.selectable, false)
  assert.equal(arkModels.get('doubao-seed-translation-250915')?.selectable, false)
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
    assert.equal(model.verificationState, 'unverified')
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
      'gemini-3.1-flash-image': ['1K', '2K', '4K'],
      'gemini-3.1-flash-lite-image': ['1K'],
      'gemini-3-pro-image': ['1K', '2K', '4K'],
      'gemini-2.5-flash-image': ['1K'],
    },
    bailian: {
      'wan2.7-image-pro': ['1K', '2K'],
      'wan2.7-image': ['1K', '2K'],
      'qwen-image-3.0-pro': ['1K', '2K'],
      'qwen-image-2.0-pro': ['1K', '2K'],
      'qwen-image-2.0': ['1K', '2K'],
      'z-image-turbo': ['1K', '2K'],
    },
    openai: {
      'gpt-image-2': ['2K'],
      'gpt-image-1': ['2K'],
      'gpt-image-1-mini': ['2K'],
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
    assert.equal(result.registryVersion, '2026-08-20.v7')
    const imageModels = result.providers[provider].models.filter((model: any) => model.roles.includes('image'))
    assert.deepEqual(
      Object.fromEntries(imageModels.map((model: any) => [model.id, model.capabilities.refineResolutions])),
      providerExpected,
    )
    for (const model of imageModels) {
      assert.ok(Array.isArray(model.capabilities.refineResolutions), `${provider}/${model.id}`)
      assert.equal(
        model.capabilities.refineResolutions.every((value: string) => ['1K', '2K', '4K'].includes(value)),
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
    size: '2K',
    sequential_image_generation: 'disabled',
    stream: false,
    response_format: 'b64_json',
  })
  assert.deepEqual(calls[3].body, {
    model: 'doubao-seedream-4-0-250828',
    prompt: 'edit diagram',
    image: ['data:image/png;base64,YQ=='],
    size: '2K',
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
    await legacy.callImageModel('ark', 'doubao-seedream-5-0-lite-260128', 'key', 'canonical alias', '16:9', '', '4K')
  } finally {
    legacy.configureRuntimeFetch()
  }

  assert.deepEqual(calls[0].body.thinking, { type: 'disabled' })
  assert.deepEqual(calls[1].body, {
    model: 'doubao-seedream-5-0-pro-260628',
    prompt: 'pro image',
    size: '1K',
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
  assert.equal(legacy.normalizeModelName('openai', 'gpt-image-1.5'), 'gpt-image-2')
  assert.equal(legacy.normalizeModelName('bailian', 'qwen3.7-max'), 'qwen3.7-plus')
  assert.equal(legacy.normalizeModelName('bailian', 'qwen-image-2.0-pro'), 'qwen-image-2.0-pro')
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
  assert.deepEqual(models, ['glm-5.2', 'qwen3.7-plus'])
})

test('OpenRouter routes every dedicated image catalog model to POST /images', async () => {
  const legacy = await loadLegacy()
  const calls: Array<{ url: string; body: any }> = []
  const textAndImageModel = {
    id: 'google/gemini-3.1-flash-image',
    name: 'Nano Banana 2',
    architecture: { input_modalities: ['text', 'image'], output_modalities: ['text', 'image'] },
    supported_parameters: { output_format: { values: ['png'] } },
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
      return Response.json({ data: [{ b64_json: body.model.includes('gemini') ? 'Z2VtaW5p' : 'ZGVkaWNhdGVk', media_type: 'image/png' }] })
    }
    if (url.endsWith('/chat/completions')) {
      return Response.json({ choices: [{ message: { images: [{ image_url: { url: 'data:image/png;base64,Y2hhdA==' } }] } }] })
    }
    throw new Error(`unexpected request: ${url}`)
  })
  try {
    assert.equal(
      await legacy.callImageModel('openrouter', 'openrouter/black-forest-labs/flux.2-pro', 'key', 'diagram', '16:9', 'data:image/png;base64,YQ==', '2K'),
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
    assert.deepEqual(registryModels.get('google/gemini-3.6-flash')?.roles, ['main', 'vision'])
    assert.equal(registryModels.get('black-forest-labs/flux.2-pro')?.vendor, 'Black Forest Labs')
    assert.deepEqual(registryModels.get('black-forest-labs/flux.2-pro')?.inputModalities, ['text', 'image'])
    assert.equal(registryModels.get('black-forest-labs/flux.2-pro')?.capabilities.imageEditMode, 'direct-edit')
    assert.deepEqual(registryModels.get('black-forest-labs/flux.2-pro')?.capabilities.refineResolutions, ['1K', '2K', '4K'])
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

test('OpenRouter recommendations sort first without hiding the complete compatible catalog', async () => {
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
      'openai/gpt-5.6-sol', 'sourceful/riverflow-v2.5-pro', 'google/gemini-3.7-flash', 'vendor/alpha', 'vendor/zeta',
    ])
    assert.equal(registry.providers.openrouter.models.length, 5)
    assert.equal(registry.providers.openrouter.models[0].recommended, true)
    assert.equal(registry.providers.openrouter.models[1].recommended, true)
    assert.equal(registry.providers.openrouter.models[2].recommended, true)
    assert.deepEqual(registry.providers.openrouter.defaults, {
      main: 'openai/gpt-5.6-sol',
      image: 'sourceful/riverflow-v2.5-pro',
      vision: 'google/gemini-3.7-flash',
    })
    assert.equal(registry.providers.openrouter.accessKind, 'aggregator')
    assert.equal(registry.providers.openrouter.routeContractVersion, 1)
    assert.equal(registry.providers.openrouter.accountCatalogRequired, false)
    for (const model of registry.providers.openrouter.models) {
      assert.equal(model.releasedAt, null, `${model.id} must not reuse OpenRouter created as a vendor release date`)
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
    assert.equal(registry.registryVersion, '2026-08-20.v7')
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
    supported_parameters: { output_format: { values: ['png'] } },
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

test('OpenRouter keeps incompatible image models visible but non-selectable', async () => {
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
    const registryModels = new Map<string, any>(registry.providers.openrouter.models.map((model: any) => [model.id, model]))
    for (const model of incompatible) {
      const entry = registryModels.get(model.id)
      assert.ok(entry, model.id)
      assert.equal(entry.selectable, false)
      assert.equal(entry.roles.includes('image'), false)
      assert.match(entry.disabledReason, /PNG or SVG/)
      assert.deepEqual(entry.capabilities.outputFormats, model.supported_parameters.output_format.values)
    }
    assert.equal(registryModels.get(safe.id)?.selectable, true)
    assert.equal(registryModels.get(safe.id)?.roles.includes('image'), true)
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
    assert.ok(entry)
    assert.equal(entry.selectable, false)
    assert.deepEqual(entry.roles, [])
    assert.match(entry.disabledReason, /explicit PNG or SVG output_format/)
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

test('OpenRouter image default is always a live explicitly compatible image-role model', async () => {
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
    for (const id of ['openai/gpt-image-2', 'openai/gpt-5.4-image-2', 'google/gemini-3.1-flash-image', 'sourceful/jpeg-only']) {
      assert.equal(models.get(id)?.selectable, false, id)
      assert.equal(models.get(id)?.roles.includes('image'), false, id)
      assert.equal(models.get(id)?.recommended, false, id)
    }

    const rejected = await legacy.default(context({
      action: 'createJob', provider: 'openrouter', apiKeys: { openrouter: 'key' },
      methodContent: 'A sufficiently detailed method section for rejecting an incompatible image model.',
      caption: 'A valid caption.', mainModelName: 'openai/gpt-5.5', imageModelName: 'openai/gpt-image-2',
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

  assert.equal(payloads[0].parameters.size, '4096*2304')
  assert.equal(payloads[0].parameters.thinking_mode, true)
  assert.equal(Object.hasOwn(payloads[0].parameters, 'prompt_extend'), false)
  assert.equal(payloads[1].parameters.size, '2048*1152')
  assert.equal(payloads[1].parameters.prompt_extend, true)
  assert.equal(Object.hasOwn(payloads[1].parameters, 'thinking_mode'), false)
  assert.equal(payloads[1].model, 'qwen-image-2.0-pro')
  assert.equal(payloads[2].parameters.size, '2048*1152')
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
    { image: 'https://signed.invalid/object' },
    { text: 'Make labels clearer' },
  ])
  assert.equal(generationPayload.parameters.size, '2048*1152')
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
                const state = globalThis.__paperbananaLegacyTestState ||= { inserts: [], jobRows: [], deletedOwnerKeys: [], deletedObjects: [], storedObjectBytes: {}, readFileLimits: [], ossWriteMode: 'fail', ossWrites: [], referenceRows: [], referenceFindQueries: [], signedReferenceKeys: [], signingFailures: [] };
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
