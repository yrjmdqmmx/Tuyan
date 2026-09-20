import test from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { crc32 } from 'node:zlib'
import { normalizeUniversalRoute, normalizeUniversalBaseUrl, universalCredential, universalModelEntry, universalReferencePolicy, UniversalApiError, type UniversalProtocol } from '../../../packages/api/src/universal-api.js'
import { createUniversalRuntime, universalCatalogRows } from '../src/universal-adapters.js'
import type { UniversalTransportRequest, UniversalTransport } from '../src/universal-transport.js'

const imageBytes = await sharp({ create: { width: 2, height: 3, channels: 3, background: '#ee4422' } }).png().toBuffer()
const image = { base64: imageBytes.toString('base64'), mimeType: 'image/png' }
const imageReply = image.base64
function config(protocol: UniversalProtocol = 'openai-chat', imageMode = false, compatibility = 'standard'): any {
  return { accessProvider: 'custom', modelId: 'EXACT/Unknown Model:v9', custom: { version: 1, connectionId: 'my-connection', protocol, baseUrl: 'https://api.example.com/custom/v9', compatibility, catalogFormat: protocol === 'dashscope-multimodal' ? 'none' : protocol.startsWith('gemini-') ? 'gemini' : protocol === 'anthropic-messages' ? 'anthropic' : 'openai',
    capabilities: { text: !imageMode, vision: !imageMode, imageGeneration: imageMode, imageEditing: imageMode },
    inputLimits: { maxCount: 3, maxBytes: 1000000, maxTotalBytes: 2000000, maxDimension: 100, maxPixels: 10000, requestMaxBytes: 3000000, mimeTypes: ['image/png', 'image/jpeg', 'image/webp'] },
    outputLimits: { maxBytes: 1000000, maxDimension: 2048, maxPixels: 4000000, mimeTypes: ['image/png', 'image/jpeg', 'image/webp'] },
    ...(imageMode ? { outputSizes: [{ resolution: '1K', aspectRatio: '1:1', value: protocol.startsWith('gemini-') || compatibility === 'openrouter-image' ? '1K' : protocol === 'dashscope-multimodal' ? '1024*1024' : '1024x1024' }] } : {}),
  } }
}
function fixture(response: any, status = 200) {
  const requests: UniversalTransportRequest[] = [], checked: string[] = []
  const transport: UniversalTransport = { async checkUrl(url) { checked.push(url) }, async request(request) { requests.push(request); return { status, headers: new Headers({ 'content-type': 'application/json' }), bytes: Buffer.from(JSON.stringify(response)) } } }
  return { requests, checked, runtime: createUniversalRuntime({ transport }) }
}
function fails(code: string, state = 'not_sent') { return (error: unknown) => error instanceof UniversalApiError && error.code === code && error.requestState === state }

test('base URL normalization has protocol defaults and retains one explicit version prefix', () => {
  for (const [protocol, path] of [['openai-chat', '/v1'], ['gemini-interactions', '/v1beta'], ['dashscope-multimodal', '/api/v1']] as const) assert.equal(normalizeUniversalBaseUrl('https://api.example.com/', protocol), `https://api.example.com${path}`)
  assert.equal(normalizeUniversalBaseUrl('https://api.example.com/custom/v8/', 'openai-chat'), 'https://api.example.com/custom/v8')
  for (const url of ['http://api.example.com', 'https://user:key@api.example.com', 'https://api.example.com:8443', 'https://api.example.com/v1?key=secret', 'https://api.example.com/#fragment', 'https://api.example.com/v1/chat/completions', 'https://api.example.com/v1/responses', 'https://api.example.com/v1/images/edits', 'https://api.example.com/v1beta/models/x:generateContent', 'https://api.example.com/a/../v1', 'https://api.example.com/%76%31', 'https://localhost', 'https://api.local']) assert.throws(() => normalizeUniversalBaseUrl(url, 'openai-chat'), fails('ENDPOINT_UNSAFE'), url)
})
test('unknown exact model IDs require explicit booleans and both limits without name inference', () => {
  const route = config(); route.modelId = 'gpt-best-vision-image'; delete route.custom.capabilities
  assert.throws(() => normalizeUniversalRoute(route), fails('CONFIG_INVALID'))
  for (const field of ['inputLimits', 'outputLimits']) { const bad = config(); delete bad.custom[field]; assert.throws(() => normalizeUniversalRoute(bad), fails('CONFIG_INVALID')) }
  const normalized = normalizeUniversalRoute(config()); assert.equal(normalized.modelId, 'EXACT/Unknown Model:v9'); assert.equal(normalized.custom.auth, 'bearer')
  assert.equal(normalizeUniversalRoute(config('anthropic-messages')).custom.auth, 'x-api-key')
  assert.equal(normalizeUniversalRoute(config('gemini-interactions')).custom.auth, 'x-goog-api-key')
  assert.throws(() => normalizeUniversalRoute(config('openai-responses', true)), fails('CAPABILITY_UNSUPPORTED'))
  assert.throws(() => normalizeUniversalRoute(config('openai-images', true, 'openrouter-image')), fails('CONFIG_INVALID'))
})
test('declared image ceilings clamp to platform and model entry retains resolution ratio pairs', () => {
  const route = config('openai-images', true)
  Object.assign(route.custom.inputLimits, { maxCount: 99, maxBytes: 1e9, maxTotalBytes: 1e9, maxDimension: 99999, maxPixels: 1e9 })
  route.custom.outputSizes.push({ resolution: '2K', aspectRatio: '16:9', value: '1792x1024' })
  const normalized = normalizeUniversalRoute(route)
  assert.deepEqual([normalized.custom.inputLimits.maxCount, normalized.custom.inputLimits.maxBytes, normalized.custom.inputLimits.maxTotalBytes, normalized.custom.inputLimits.maxDimension, normalized.custom.inputLimits.maxPixels], [8, 20971520, 83886080, 16384, 32000000])
  const model = universalModelEntry(route)
  assert.equal(model.verified, false); assert.equal(model.verificationState, 'user-declared'); assert.deepEqual(model.capabilities.aspectRatiosByResolution, { '1K': ['1:1'], '2K': ['16:9'] })
  const text = config(); text.custom.capabilities.vision = false; assert.equal(universalReferencePolicy(text).maxCount, 0)
})
test('credential envelope rejects route hijacking and never includes a supplied secret in errors', () => {
  const route = normalizeUniversalRoute(config())
  const serialize = (overrides: any = {}) => JSON.stringify({ 'my-connection': { baseUrl: route.custom.baseUrl, protocol: route.custom.protocol, auth: route.custom.auth, apiKey: 'secret-key', ...overrides } })
  assert.equal(universalCredential(route, serialize()), 'secret-key')
  for (const changes of [{ baseUrl: 'https://other.example.com/v1' }, { protocol: 'openai-images' }, { auth: 'x-api-key' }, { apiKey: 'secret\nheader' }]) {
    assert.throws(() => universalCredential(route, serialize(changes)), error => fails('CREDENTIAL_MISMATCH')(error) && !JSON.stringify(error).includes('secret'))
  }
  for (const malformed of ['secret-key', 'null', '{}', '[]']) assert.throws(() => universalCredential(route, malformed), fails('CREDENTIAL_MISMATCH'))
})
const textCases: [UniversalProtocol, any, string, (body: any) => void][] = [
  ['openai-chat', { choices: [{ finish_reason: 'stop', message: { content: 'complete' } }] }, '/chat/completions', b => { assert.equal(b.messages[0].role, 'system'); assert.match(b.messages[1].content[1].image_url.url, /^data:image\/png/); assert.equal(b.stream, false) }],
  ['openai-responses', { status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: 'complete' }] }] }, '/responses', b => { assert.equal(b.instructions, 'system'); assert.equal(b.input[0].content[1].type, 'input_image'); assert.equal(b.store, false) }],
  ['anthropic-messages', { stop_reason: 'end_turn', content: [{ type: 'thinking', thinking: 'hidden' }, { type: 'text', text: 'complete' }] }, '/messages', b => { assert.equal(b.system, 'system'); assert.equal(b.messages[0].content[0].source.media_type, 'image/png'); assert.equal(b.max_tokens, 123) }],
  ['gemini-generate-content', { candidates: [{ finishReason: 'STOP', content: { parts: [{ thought: true, text: 'hidden' }, { text: 'complete' }] } }] }, '/models/EXACT%2FUnknown%20Model%3Av9:generateContent', b => { assert.equal(b.systemInstruction.parts[0].text, 'system'); assert.equal(b.contents[0].parts[1].inlineData.mimeType, 'image/png') }],
  ['gemini-interactions', { status: 'completed', steps: [{ type: 'model_output', content: [{ type: 'text', text: 'complete' }] }] }, '/interactions', b => { assert.equal(b.system_instruction, 'system'); assert.equal(b.input[1].mime_type, 'image/png'); assert.equal(b.store, false) }],
  ['dashscope-multimodal', { output: { choices: [{ finish_reason: 'stop', message: { content: [{ text: 'complete' }] } }] } }, '/services/aigc/multimodal-generation/generation', b => { assert.equal(b.input.messages[0].role, 'system'); assert.match(b.input.messages[1].content[0].image, /^data:image\/png/) }],
]
for (const [protocol, response, path, check] of textCases) test(`${protocol}: native text encoder/parser and exact model identity`, async () => {
  const { runtime, requests } = fixture(response)
  assert.equal(await runtime.text(config(protocol), 'key', { systemPrompt: 'system', prompt: 'user', images: [image], temperature: 0.2, maxTokens: 123 }), 'complete')
  assert.equal(requests.length, 1); assert.equal(requests[0].url, `https://api.example.com/custom/v9${path}`)
  const body = JSON.parse(requests[0].body as string)
  if (!protocol.startsWith('gemini-generate')) assert.equal(body.model, 'EXACT/Unknown Model:v9')
  assert.ok(!('temperature' in body)); check(body)
  if (protocol === 'anthropic-messages') assert.equal(requests[0].headers!['anthropic-version'], '2023-06-01')
})
const imageCases: [UniversalProtocol, string, any, (body: any) => void][] = [
  ['openai-images', 'standard', { data: [{ b64_json: imageReply }] }, b => { assert.equal(b.size, '1024x1024'); assert.equal(b.n, 1); assert.ok(!('response_format' in b)) }],
  ['openai-images', 'ark-images', { data: [{ b64_json: imageReply }] }, b => { assert.equal(b.response_format, 'b64_json'); assert.match(b.image, /^data:image\/png/); assert.equal(b.size, '1024x1024') }],
  ['openai-chat', 'openrouter-image', { choices: [{ finish_reason: 'stop', message: { images: [{ image_url: { url: `data:image/png;base64,${imageReply}` } }] } }] }, b => { assert.deepEqual(b.modalities, ['image', 'text']); assert.equal(b.image_config.image_size, '1K') }],
  ['gemini-generate-content', 'standard', { candidates: [{ finishReason: 'STOP', content: { parts: [{ inlineData: { data: imageReply, mimeType: 'image/png' } }] } }] }, b => { assert.equal(b.generationConfig.imageConfig.imageSize, '1K'); assert.equal(b.contents[0].parts[1].inlineData.mimeType, 'image/png') }],
  ['gemini-interactions', 'standard', { status: 'completed', steps: [{ type: 'model_output', content: [{ type: 'image', data: imageReply, mime_type: 'image/png' }] }] }, b => { assert.equal(b.response_format.type, 'image'); assert.equal(b.store, false); assert.equal(b.input[1].type, 'image') }],
  ['dashscope-multimodal', 'standard', { output: { choices: [{ message: { content: [{ image: `data:image/png;base64,${imageReply}` }] } }] } }, b => { assert.equal(b.parameters.size, '1024*1024'); assert.match(b.input.messages[0].content[0].image, /^data:image\/png/) }],
]
for (const [protocol, compatibility, response, check] of imageCases) test(`${protocol}/${compatibility}: real image envelope and output bytes`, async () => {
  const { runtime, requests } = fixture(response)
  const result = await runtime.image(config(protocol, true, compatibility), 'key', { prompt: 'draw', sourceImages: protocol === 'openai-images' && compatibility === 'standard' ? [] : [image], aspectRatio: '1:1', imageSize: '1K' })
  assert.equal(result.base64, imageReply); assert.equal(result.mimeType, 'image/png'); assert.equal(requests.length, 1)
  check(JSON.parse(requests[0].body as string))
})
test('OpenAI image editing uses actual multipart binary and no JSON source fallback', async () => {
  const { runtime, requests } = fixture({ data: [{ b64_json: imageReply }] })
  await runtime.image(config('openai-images', true), 'key', { prompt: 'edit', sourceImages: [image], aspectRatio: '1:1', imageSize: '1K' })
  assert.ok(requests[0].url.endsWith('/images/edits')); assert.match(requests[0].headers!['Content-Type'], /^multipart\/form-data; boundary=tuyan-/)
  const body = Buffer.from(requests[0].body as Uint8Array); assert.ok(body.includes(imageBytes)); assert.ok(body.includes(Buffer.from('name="image"; filename="source-0.png"')))
})
test('unsupported steps, image corruption, MIME mismatch, geometry, total bytes, output sizes and encoded body fail before transport', async () => {
  const { runtime, requests } = fixture({})
  const route = config(); route.custom.capabilities.vision = false
  await assert.rejects(runtime.text(route, 'key', { prompt: 'read', images: [image] }), fails('CAPABILITY_UNSUPPORTED'))
  await assert.rejects(runtime.text(config(), 'key', { prompt: 'read', images: [{ ...image, mimeType: 'image/jpeg' }] }), fails('IMAGE_INVALID'))
  await assert.rejects(runtime.text(config(), 'key', { prompt: 'read', images: [{ base64: 'YmFk', mimeType: 'image/png' }] }), fails('IMAGE_INVALID'))
  const tiny = config(); tiny.custom.inputLimits.maxDimension = 1
  await assert.rejects(runtime.text(tiny, 'key', { prompt: 'read', images: [image] }), fails('INPUT_LIMIT'))
  const bytes = config(); bytes.custom.inputLimits.maxTotalBytes = imageBytes.length - 1
  await assert.rejects(runtime.text(bytes, 'key', { prompt: 'read', images: [image] }), fails('INPUT_LIMIT'))
  const request = config(); request.custom.inputLimits.requestMaxBytes = 100
  await assert.rejects(runtime.text(request, 'key', { prompt: 'a'.repeat(200) }), fails('INPUT_LIMIT'))
  await assert.rejects(runtime.image(config('openai-images', true), 'key', { prompt: 'draw', aspectRatio: '16:9', imageSize: '1K' }), fails('OUTPUT_SIZE_UNSUPPORTED'))
  const huge = config('openai-images', true); huge.custom.outputSizes[0].value = '10000x10000'
  await assert.rejects(runtime.image(huge, 'key', { prompt: 'draw', aspectRatio: '1:1', imageSize: '1K' }), fails('OUTPUT_SIZE_UNSUPPORTED'))
  assert.equal(requests.length, 0)
})
test('partial, tool-only, asynchronous and malformed successful replies stay unknown with exactly one POST', async () => {
  for (const [protocol, response, status] of [
    ['openai-chat', { choices: [{ finish_reason: 'length', message: { content: 'partial' } }] }, 200],
    ['openai-responses', { status: 'in_progress', output: [] }, 200],
    ['anthropic-messages', { stop_reason: 'tool_use', content: [] }, 200],
    ['gemini-interactions', { status: 'running', id: 'id' }, 200],
    ['openai-chat', { choices: [] }, 202],
  ] as [UniversalProtocol, any, number][]) {
    const { runtime, requests } = fixture(response, status)
    await assert.rejects(runtime.text(config(protocol), 'key', { prompt: 'text' }), error => error instanceof UniversalApiError && error.requestState === 'unknown' && error.uncertain)
    assert.equal(requests.length, 1)
  }
})
test('output MIME and corrupt bytes are never accepted as successful images', async () => {
  const { runtime, requests } = fixture({ candidates: [{ finishReason: 'STOP', content: { parts: [{ inlineData: { data: imageReply, mimeType: 'image/jpeg' } }] } }] })
  await assert.rejects(runtime.image(config('gemini-generate-content', true), 'key', { prompt: 'draw', aspectRatio: '1:1', imageSize: '1K' }), fails('RESPONSE_INVALID', 'unknown')); assert.equal(requests.length, 1)
})
test('catalog rows isolate null/missing/type/protocol/duplicate records, including duplicates of invalid rows', () => {
  const result = universalCatalogRows({ data: [null, {}, { id: null }, { id: 4 }, { id: 'good' }, { id: 'dup' }, { id: 'dup', supported_protocols: null }, { id: 'null-protocol', supported_protocols: null }, { id: 'changed', supported_protocols: ['alien'] }] }, 'openai-chat')
  assert.deepEqual(result.models, [{ id: 'good' }]); assert.equal(result.warnings.length, 8)
  assert.deepEqual(new Set(result.warnings.map(x => x.code)), new Set(['row_null', 'id_missing', 'id_null', 'id_type', 'id_duplicate', 'protocol_null', 'protocol_unsupported']))
})
test('configuration and read-only catalog remain distinct from real invocation verification', async () => {
  const { runtime, requests, checked } = fixture({ data: [{ id: 'visible-model' }] })
  const result = await runtime.checkConfig(config()); assert.equal(result.state, 'configuration-valid'); assert.equal(result.verified, false); assert.equal(checked.length, 1); assert.equal(requests.length, 0)
  const catalog = await runtime.catalog(config(), 'key'); assert.equal(catalog.state, 'catalog-visible'); assert.equal(catalog.verified, false); assert.deepEqual(catalog.models, [{ id: 'visible-model' }]); assert.equal(requests[0].method, 'GET')
  const unsupported = await runtime.catalog(config('dashscope-multimodal'), 'key'); assert.equal(unsupported.state, 'unsupported'); assert.equal(requests.length, 1)
})
test('empty, entirely invalid and selected-ID absent catalogs have separate evidence', async () => {
  for (const [data, state, visible] of [[{ data: [] }, 'catalog-empty', false], [{ data: [null, {}] }, 'catalog-invalid', false], [{ data: [{ id: 'EXACT/Unknown Model:v9' }] }, 'catalog-visible', true], [{ data: [{ id: 'other' }] }, 'catalog-visible', false]] as const) {
    const { runtime } = fixture(data)
    const result = await runtime.catalog(config(), 'key'); assert.equal(result.state, state); assert.equal(result.selectedModelVisible, visible); assert.equal(result.verified, false)
  }
  const mismatch = universalCatalogRows({ data: [{ id: 'wrong', supported_protocols: ['gemini-interactions'] }, { id: 'right', supported_protocols: ['openai:chat-completions'] }] }, 'openai-chat')
  assert.deepEqual(mismatch.models, [{ id: 'right' }]); assert.equal(mismatch.warnings[0].code, 'protocol_mismatch')
})
test('model path traversal and malformed optional compatibility values are not accepted', () => {
  for (const id of ['../private', 'models/../private', 'models/./private', 'model\\private']) { const route = config(); route.modelId = id; assert.throws(() => normalizeUniversalRoute(route), fails('CONFIG_INVALID')) }
})
test('optional compatibility is validated when present', () => {
  for (const compatibility of [null, false, 0, '']) { const route = config(); route.custom.compatibility = compatibility; assert.throws(() => normalizeUniversalRoute(route), fails('CONFIG_INVALID')) }
})
test('image asset failure remains unknown after the single generation request', async () => {
  const requests: UniversalTransportRequest[] = []
  const runtime = createUniversalRuntime({ transport: { async checkUrl() {}, async request(request) { requests.push(request); if (request.kind === 'asset') throw new UniversalApiError('ENDPOINT_UNSAFE'); return { status: 200, headers: new Headers(), bytes: Buffer.from(JSON.stringify({ data: [{ url: 'https://private.example.com/image.png?signature=sensitive' }] })) } } } })
  await assert.rejects(runtime.image(config('openai-images', true), 'key', { prompt: 'draw', aspectRatio: '1:1', imageSize: '1K' }), fails('ENDPOINT_UNSAFE', 'unknown'))
  assert.equal(requests.filter(x => x.method === 'POST').length, 1); assert.equal(requests[1].headers, undefined)
})
test('mixed completed tool calls and final text across protocols remain unknown after exactly one POST', async () => {
  const cases: [UniversalProtocol, any][] = [
    ['openai-chat', { choices: [{ finish_reason: 'stop', message: { content: 'visible', tool_calls: [{ type: 'function', function: { name: 'act', arguments: '{}' } }] } }] }],
    ['openai-chat', { choices: [{ finish_reason: 'stop', message: { content: 'visible' } }, { finish_reason: 'tool_calls', message: { function_call: { name: 'act', arguments: '{}' } } }] }],
    ...['function_call', 'custom_tool_call', 'web_search_call', 'file_search_call', 'code_interpreter_call', 'computer_call', 'image_generation_call', 'mcp_call', 'mcp_list_tools', 'mcp_approval_request', 'local_shell_call', 'shell_call', 'apply_patch_call', 'future_action'].map(type => ['openai-responses', { status: 'completed', output: [{ type, status: 'completed', name: 'act' }, { type: 'message', status: 'completed', content: [{ type: 'output_text', text: 'visible' }] }] }] as [UniversalProtocol, any]),
    ['anthropic-messages', { stop_reason: 'end_turn', content: [{ type: 'text', text: 'visible' }, { type: 'tool_use', id: 'tool', name: 'act', input: {} }] }],
    ['anthropic-messages', { stop_reason: 'end_turn', content: [{ type: 'server_tool_use', id: 'tool', name: 'web_search', input: {} }, { type: 'text', text: 'visible' }] }],
    ['gemini-generate-content', { candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'visible' }, { functionCall: { name: 'act', args: {} } }] } }] }],
    ['gemini-generate-content', { candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'visible' }] } }, { finishReason: 'STOP', content: { parts: [{ functionCall: { name: 'act', args: {} } }] } }] }],
    ['gemini-generate-content', { candidates: [{ finishReason: 'STOP', content: { parts: [{ executableCode: { language: 'PYTHON', code: 'print(1)' } }, { text: 'visible' }] } }] }],
    ['gemini-interactions', { status: 'completed', steps: [{ type: 'function_call', name: 'act', arguments: {} }, { type: 'model_output', content: [{ type: 'text', text: 'visible' }] }] }],
    ['gemini-interactions', { status: 'completed', steps: [{ type: 'tool_call', name: 'act' }, { type: 'model_output', content: [{ type: 'text', text: 'visible' }] }] }],
    ['gemini-interactions', { status: 'completed', steps: [{ type: 'model_output', content: [{ type: 'text', text: 'visible' }, { type: 'function_call', name: 'act', arguments: {} }] }] }],
    ['dashscope-multimodal', { output: { choices: [{ finish_reason: 'stop', message: { content: [{ text: 'visible' }], tool_calls: [{ type: 'function', function: { name: 'act', arguments: '{}' } }] } }] } }],
    ['dashscope-multimodal', { output: { choices: [{ finish_reason: 'stop', message: { content: [{ text: 'visible' }] } }, { message: { content: [{ type: 'tool_call', name: 'act' }] } }] } }],
  ]
  for (const [protocol, response] of cases) {
    const { runtime, requests } = fixture(response)
    await assert.rejects(runtime.text(config(protocol), 'key', { prompt: 'text' }), fails('RESPONSE_INVALID', 'unknown'), JSON.stringify({ protocol, response }))
    assert.equal(requests.length, 1); assert.equal(requests[0].method, 'POST')
  }
})
test('image output mixed with tool calls is rejected before any asset download', async () => {
  const cases: [UniversalProtocol, string, any][] = [
    ['openai-images', 'standard', { tool_calls: [{ name: 'act' }], data: [{ url: 'https://asset.example.com/image.png' }] }],
    ['openai-chat', 'openrouter-image', { choices: [{ finish_reason: 'stop', message: { tool_calls: [{ type: 'function', function: { name: 'act' } }], images: [{ image_url: { url: 'https://asset.example.com/image.png' } }] } }] }],
    ['gemini-generate-content', 'standard', { candidates: [{ finishReason: 'STOP', content: { parts: [{ inlineData: { data: imageReply, mimeType: 'image/png' } }, { functionCall: { name: 'act', args: {} } }] } }] }],
    ['gemini-interactions', 'standard', { status: 'completed', steps: [{ type: 'function_result', result: {} }, { type: 'model_output', content: [{ type: 'image', data: imageReply, mime_type: 'image/png' }] }] }],
    ['dashscope-multimodal', 'standard', { output: { choices: [{ message: { tool_calls: [{ name: 'act' }], content: [{ image: 'https://asset.example.com/image.png' }] } }] } }],
  ]
  for (const [protocol, compatibility, response] of cases) {
    const { runtime, requests } = fixture(response)
    await assert.rejects(runtime.image(config(protocol, true, compatibility), 'key', { prompt: 'draw', aspectRatio: '1:1', imageSize: '1K' }), fails('RESPONSE_INVALID', 'unknown'))
    assert.equal(requests.length, 1); assert.equal(requests[0].method, 'POST')
  }
})
test('ordinary reasoning or mentions of tools inside text are not mistaken for tool calls', async () => {
  const responses = fixture({ status: 'completed', output: [{ type: 'reasoning', summary: [{ type: 'summary_text', text: 'reasoning summary' }] }, { type: 'message', content: [{ type: 'output_text', text: 'Use the function_call field in documentation.' }] }] })
  assert.equal(await responses.runtime.text(config('openai-responses'), 'key', { prompt: 'text' }), 'Use the function_call field in documentation.')
  const interactions = fixture({ status: 'completed', steps: [{ type: 'model_thought', content: [{ type: 'thought', text: 'considering a tool' }] }, { type: 'model_output', content: [{ type: 'text', text: 'complete' }] }] })
  assert.equal(await interactions.runtime.text(config('gemini-interactions'), 'key', { prompt: 'text' }), 'complete')
  const chat = fixture({ choices: [{ finish_reason: 'stop', message: { content: 'complete', tool_calls: [], function_call: null } }] })
  assert.equal(await chat.runtime.text(config('openai-chat'), 'key', { prompt: 'text' }), 'complete')
})
test('non-ASCII and non-printable API keys fail locally in both credential binding and runtime headers', async () => {
  const route = normalizeUniversalRoute(config()), { runtime, requests } = fixture({ choices: [{ finish_reason: 'stop', message: { content: 'complete' } }] })
  for (const apiKey of ['中文密钥', 'secret-é', 'secret\u00a0key', 'secret key', 'secret\nkey', 'secret\u007fkey', 'secret\u0000key']) {
    const envelope = JSON.stringify({ [route.custom.connectionId]: { baseUrl: route.custom.baseUrl, protocol: route.custom.protocol, auth: route.custom.auth, apiKey } })
    assert.throws(() => universalCredential(route, envelope), fails('CREDENTIAL_MISMATCH'))
    await assert.rejects(runtime.text(route, apiKey, { prompt: 'text' }), fails('CREDENTIAL_MISMATCH'))
    await assert.rejects(runtime.catalog(route, apiKey), fails('CREDENTIAL_MISMATCH'))
  }
  assert.equal(requests.length, 0)
})

test('Gemini returns the blue final PNG and never the red thought PNG for both inline-data spellings', async () => {
  const red = (await sharp({ create: { width: 2, height: 2, channels: 3, background: '#ff0000' } }).png().toBuffer()).toString('base64')
  const blue = (await sharp({ create: { width: 2, height: 2, channels: 3, background: '#0000ff' } }).png().toBuffer()).toString('base64')
  for (const field of ['inlineData', 'inline_data']) {
    for (const finalThought of [undefined, false]) {
      const blob = (data: string) => field === 'inlineData' ? { data, mimeType: 'image/png' } : { data, mime_type: 'image/png' }
      const response = { candidates: [{ finishReason: 'STOP', content: { parts: [{ thought: true, [field]: blob(red) }, { text: 'final image' }, { ...(finalThought === undefined ? {} : { thought: finalThought }), [field]: blob(blue) }] } }] }
      const { runtime, requests } = fixture(response)
      const result = await runtime.image(config('gemini-generate-content', true), 'key', { prompt: 'draw', aspectRatio: '1:1', imageSize: '1K' })
      assert.equal(result.base64, blue); assert.notEqual(result.base64, red); assert.equal(result.mimeType, 'image/png')
      const pixels = await sharp(Buffer.from(result.base64, 'base64')).raw().toBuffer()
      assert.deepEqual([...pixels.subarray(0, 3)], [0, 0, 255]); assert.equal(requests.length, 1)
    }
  }
})

test('Gemini thought-only images remain unknown after one POST rather than becoming final output', async () => {
  const red = (await sharp({ create: { width: 2, height: 2, channels: 3, background: '#ff0000' } }).png().toBuffer()).toString('base64')
  for (const field of ['inlineData', 'inline_data']) {
    const { runtime, requests } = fixture({ candidates: [{ finishReason: 'STOP', content: { parts: [{ thought: true, [field]: { data: red, mimeType: 'image/png' } }, { text: 'no final image' }] } }] })
    await assert.rejects(runtime.image(config('gemini-generate-content', true), 'key', { prompt: 'draw', aspectRatio: '1:1', imageSize: '1K' }), fails('RESPONSE_INVALID', 'unknown'))
    assert.equal(requests.length, 1); assert.equal(requests[0].method, 'POST')
  }
})

test('Gemini toolCall/toolResponse and snake-case equivalents cannot be hidden by STOP and final text or image', async () => {
  for (const field of ['toolCall', 'toolResponse', 'tool_call', 'tool_response']) {
    for (const inOtherCandidate of [false, true]) {
      for (const imageMode of [false, true]) {
        const finalParts: any[] = imageMode ? [{ inlineData: { data: imageReply, mimeType: 'image/png' } }] : [{ text: 'apparently complete' }]
        const toolPart = { [field]: { id: 'tool-1', toolType: 'GOOGLE_SEARCH', args: {}, response: {} } }
        const response = { candidates: inOtherCandidate ? [{ finishReason: 'STOP', content: { parts: finalParts } }, { finishReason: 'STOP', content: { parts: [toolPart] } }] : [{ finishReason: 'STOP', content: { parts: [...finalParts, toolPart] } }] }
        const { runtime, requests } = fixture(response)
        const result = imageMode ? runtime.image(config('gemini-generate-content', true), 'key', { prompt: 'draw', aspectRatio: '1:1', imageSize: '1K' }) : runtime.text(config('gemini-generate-content'), 'key', { prompt: 'text' })
        await assert.rejects(result, fails('RESPONSE_INVALID', 'unknown'), `${field}, otherCandidate=${inOtherCandidate}, image=${imageMode}`)
        assert.equal(requests.length, 1); assert.equal(requests[0].method, 'POST')
      }
    }
  }
})

test('Gemini Interactions ignores official thought summaries and selects only the blue model_output image', async () => {
  const red = (await sharp({ create: { width: 2, height: 2, channels: 3, background: '#ff0000' } }).png().toBuffer()).toString('base64')
  const blue = (await sharp({ create: { width: 2, height: 2, channels: 3, background: '#0000ff' } }).png().toBuffer()).toString('base64')
  const thought = { type: 'thought', summary: [{ type: 'text', text: 'intermediate' }, { type: 'image', mime_type: 'image/png', data: red }] }
  const { runtime, requests } = fixture({ status: 'completed', steps: [thought, { type: 'model_output', content: [{ type: 'image', mime_type: 'image/png', data: blue }] }] })
  const result = await runtime.image(config('gemini-interactions', true), 'key', { prompt: 'draw', aspectRatio: '1:1', imageSize: '1K' })
  assert.equal(result.base64, blue); assert.notEqual(result.base64, red); assert.equal(requests.length, 1)
  const thoughtOnly = fixture({ status: 'completed', steps: [thought] })
  await assert.rejects(thoughtOnly.runtime.image(config('gemini-interactions', true), 'key', { prompt: 'draw', aspectRatio: '1:1', imageSize: '1K' }), fails('RESPONSE_INVALID', 'unknown'))
  assert.equal(thoughtOnly.requests.length, 1)
})

function largeImageConfig(imageMode = false, compatibility = 'standard') {
  const route = config(imageMode ? compatibility === 'openrouter-image' ? 'openai-chat' : 'openai-images' : 'openai-chat', imageMode, compatibility)
  Object.assign(route.custom.inputLimits, { maxBytes: 20 * 1024 * 1024, maxTotalBytes: 20 * 1024 * 1024, requestMaxBytes: 40 * 1024 * 1024, maxDimension: 4096, maxPixels: 16000000 })
  Object.assign(route.custom.outputLimits, { maxBytes: 20 * 1024 * 1024, maxDimension: 4096, maxPixels: 16000000 })
  return route
}
// Exact byte boundaries while retaining a valid PNG, using CRC-checked ancillary
// chunks before IEND. A separate unpadded RGB fixture below exercises real pixels.
function pngAtByteBoundary(size: number): Buffer {
  let remaining = size - imageBytes.length
  const chunks: Buffer[] = [imageBytes.subarray(0, imageBytes.length - 12)]
  while (remaining) {
    let length = Math.min(remaining, 1024 * 1024)
    if (remaining > length && remaining - length < 12) length -= 12 - (remaining - length)
    const chunk = Buffer.alloc(length)
    chunk.writeUInt32BE(length - 12, 0); chunk.write('paDd', 4, 'ascii')
    chunk.writeUInt32BE(crc32(chunk.subarray(4, length - 4)), length - 4)
    chunks.push(chunk); remaining -= length
  }
  chunks.push(imageBytes.subarray(imageBytes.length - 12))
  return Buffer.concat(chunks, size)
}

test('an actual 1536-square RGB PNG above 5 MiB succeeds as both input and output without regexp stack overflow', async () => {
  const pixels = Buffer.alloc(1536 * 1536 * 3)
  let seed = 0x12345678
  for (let i = 0; i < pixels.length; i++) { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; pixels[i] = seed & 255 }
  const png = await sharp(pixels, { raw: { width: 1536, height: 1536, channels: 3 } }).png({ compressionLevel: 0 }).toBuffer()
  assert.ok(png.length > 5 * 1024 * 1024 && png.length < 20 * 1024 * 1024)
  const base64 = png.toString('base64')
  const input = fixture({ choices: [{ finish_reason: 'stop', message: { content: 'complete' } }] })
  assert.equal(await input.runtime.text(largeImageConfig(), 'key', { prompt: 'read', images: [{ base64, mimeType: 'image/png' }] }), 'complete')
  assert.equal(input.requests.length, 1); input.requests.length = 0
  const output = fixture({ data: [{ b64_json: base64 }] })
  const result = await output.runtime.image(largeImageConfig(true), 'key', { prompt: 'draw', aspectRatio: '1:1', imageSize: '1K' })
  assert.equal(result.base64, base64); assert.equal(result.mimeType, 'image/png'); assert.equal(output.requests.length, 1)
})

test('valid PNG base64 at 5, 10 and 20 MiB boundaries succeeds for input and data-URL output', async () => {
  for (const size of [5, 10, 20].map(mib => mib * 1024 * 1024)) {
    const png = pngAtByteBoundary(size), base64 = png.toString('base64')
    assert.equal(png.length, size)
    const input = fixture({ choices: [{ finish_reason: 'stop', message: { content: 'complete' } }] })
    assert.equal(await input.runtime.text(largeImageConfig(), 'key', { prompt: 'read', images: [{ base64, mimeType: 'image/png' }] }), 'complete')
    assert.equal(input.requests.length, 1); input.requests.length = 0
    const output = fixture({ choices: [{ finish_reason: 'stop', message: { images: [{ image_url: { url: `data:image/png;base64,${base64}` } }] } }] })
    const result = await output.runtime.image(largeImageConfig(true, 'openrouter-image'), 'key', { prompt: 'draw', aspectRatio: '1:1', imageSize: '1K' })
    assert.equal(result.base64, base64); assert.equal(result.mimeType, 'image/png'); assert.equal(output.requests.length, 1)
  }
})

test('illegal tails on 5–20 MiB PNG base64 are not_sent for input and unknown for output with no repeated POST', async () => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  for (const size of [5, 10, 20].map(mib => mib * 1024 * 1024)) {
    const base64 = pngAtByteBoundary(size).toString('base64'), padding = base64.endsWith('==') ? 2 : 1
    const lastIndex = base64.length - padding - 1
    const noncanonical = base64.slice(0, lastIndex) + alphabet[alphabet.indexOf(base64[lastIndex]) | 1] + base64.slice(lastIndex + 1)
    // The altered unused pad bit decodes to the same PNG in Buffer.from, so it
    // must be rejected by validation, not accidentally caught by image decoding.
    assert.equal(Buffer.from(noncanonical, 'base64').length, size)
    for (const invalid of [base64.slice(0, -1) + '!', noncanonical, base64.slice(0, -3) + '===']) {
      const input = fixture({})
      await assert.rejects(input.runtime.text(largeImageConfig(), 'key', { prompt: 'read', images: [{ base64: invalid, mimeType: 'image/png' }] }), fails('IMAGE_INVALID'))
      assert.equal(input.requests.length, 0)
      const output = fixture({ data: [{ b64_json: invalid }] })
      await assert.rejects(output.runtime.image(largeImageConfig(true), 'key', { prompt: 'draw', aspectRatio: '1:1', imageSize: '1K' }), fails('RESPONSE_INVALID', 'unknown'))
      assert.equal(output.requests.length, 1); assert.equal(output.requests[0].method, 'POST')
    }
  }
})

test('base64 length and decoded byte bounds preserve controlled local and upstream error states', async () => {
  for (const value of [imageReply + '=', imageReply.slice(0, -1)]) {
    const input = fixture({})
    await assert.rejects(input.runtime.text(config(), 'key', { prompt: 'read', images: [{ base64: value, mimeType: 'image/png' }] }), fails('IMAGE_INVALID'))
    assert.equal(input.requests.length, 0)
    const output = fixture({ data: [{ b64_json: value }] })
    await assert.rejects(output.runtime.image(config('openai-images', true), 'key', { prompt: 'draw', aspectRatio: '1:1', imageSize: '1K' }), fails('RESPONSE_INVALID', 'unknown'))
    assert.equal(output.requests.length, 1)
  }
  const inputRoute = config(); inputRoute.custom.inputLimits.maxBytes = imageBytes.length - 1
  const input = fixture({})
  await assert.rejects(input.runtime.text(inputRoute, 'key', { prompt: 'read', images: [image] }), fails('INPUT_LIMIT')); assert.equal(input.requests.length, 0)
  const outputRoute = config('openai-images', true); outputRoute.custom.outputLimits.maxBytes = imageBytes.length - 1
  const output = fixture({ data: [{ b64_json: imageReply }] })
  await assert.rejects(output.runtime.image(outputRoute, 'key', { prompt: 'draw', aspectRatio: '1:1', imageSize: '1K' }), fails('RESPONSE_LIMIT', 'unknown')); assert.equal(output.requests.length, 1)
})
