import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import sharp from 'sharp'
import { createDocument, normalizeEpsFontSubsetNames, preserveEpsTextBoundaries, renderPdfSvg, renderPrintSvg, renderSvg } from '@paperbanana/figure-core'
import { createFigureStudioService, FigureStudioError, runFigureConverter, validateExportedFile, validateFigureCommands, validateFigurePlan } from '../src/figure-studio.js'
import { createServer } from '../src/server.js'
// @ts-ignore Existing fixture composes real legacy routing with mock provider transport.
import { createRefineRuntime } from '../../../test-support/refine-runtime.mjs'

const native = { mainRoute: { accessProvider: 'openai', modelId: 'gpt-5.6-sol' }, apiKeys: { openai: 'user-fixture-key' } }
const plan = { title: '研究流程', summary: '研究材料中的两个阶段。', nodes: [{ id: 'input', label: '输入' }, { id: 'analysis', label: '分析' }], edges: [{ from: 'input', to: 'analysis' }], notes: ['请作者确认箭头语义。'] }
const pdfPrefix = '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n'
const pdfFixture = Buffer.from(`${pdfPrefix}xref\n0 2\n0000000000 65535 f \n0000000009 00000 n \ntrailer\n<< /Size 2 /Root 1 0 R >>\nstartxref\n${Buffer.byteLength(pdfPrefix)}\n%%EOF\n`)
const epsFont = (id: string) => `%%BeginResource: font FixtureSans
11 dict begin
/FontType 42 def
/FontName /FixtureSans def
/PaintType 0 def
/FontMatrix [ 1 0 0 1 0 0 ] def
/FontBBox [ 0 0 0 0 ] def
/Encoding 256 array def
0 1 255 { Encoding exch /.notdef put } for
Encoding 1 /uni03B1 put
/CharStrings 2 dict dup begin
/.notdef 0 def
/uni03B1 1 def
end readonly def
/sfnts [
<00010000>
] def
/${id} currentdict end definefont pop
%%EndResource
`
const epsFixture = `%!PS-Adobe-3.0 EPSF-3.0\n%%Creator: cairo 1.16.0\n%%BoundingBox: 0 0 100 100\n%%BeginProlog\n/BT { } bind def\n/ET { } bind def\n%%EndProlog\n${epsFont('f-0-0')}${epsFont('f-0-1')}%%Page: 1 1\nBT\nET\nshowpage\n%%Trailer\n%%EOF\n`
const document = () => createDocument({ id: 'fixture-figure', elements: [
  { id: 'label-a', type: 'text', x: 10, y: 10, width: 40, height: 10, text: '原标签' },
  { id: 'label-b', type: 'text', x: 60, y: 10, width: 40, height: 10, text: '保留标签' },
] })

test('planning enforces bounded nodes, exact shape, known edge endpoints and no duplicate IDs', () => {
  assert.deepEqual(validateFigurePlan(plan), plan)
  for (const bad of [
    { ...plan, nodes: Array.from({ length: 13 }, (_, i) => ({ id: 'n' + i, label: 'n' })) },
    { ...plan, nodes: [plan.nodes[0], plan.nodes[0]] },
    { ...plan, edges: [{ from: 'input', to: 'missing' }] },
    { ...plan, script: '<script />' },
    { ...plan, notes: Array.from({ length: 11 }, () => 'note') },
    { ...plan, notes: ['x'.repeat(1001)] },
    { ...plan, edges: [{ from: 'input', to: 'analysis', label: 'x'.repeat(121) }] },
    { ...plan, title: 'invalid\u0000text' },
  ]) assert.throws(() => validateFigurePlan(bad))
})

test('model success and invalid JSON each make one call; invalid output never claims unbilled', async () => {
  let calls = 0
  const service = createFigureStudioService({ supportedProviders: ['openai', 'tokendance', 'custom'], modelText: async () => { calls++; return calls === 1 ? JSON.stringify(plan) : 'not JSON' } })
  assert.deepEqual((await service.handle({ action: 'figureStudioPlan', materials: '研究分为输入和分析两个阶段。', ...native })).plan, plan)
  const failed = await service.handle({ action: 'figureStudioPlan', materials: '研究材料。', ...native })
  assert.equal(failed.code, 422); assert.equal(failed.requestState, 'unknown'); assert.equal(failed.billingStatus, 'unconfirmed'); assert.equal(calls, 2)
})

test('local validation rejects missing credentials, invalid custom routes, oversized material and stale edits before model', async () => {
  let calls = 0
  const service = createFigureStudioService({ supportedProviders: ['openai', 'tokendance', 'custom'], modelText: async () => { calls++; return '{}' } })
  for (const request of [
    { action: 'figureStudioPlan', materials: 'content', ...native, apiKeys: {} },
    ...['custom'].map(provider => ({ action: 'figureStudioPlan', materials: 'content', mainRoute: { accessProvider: provider, modelId: 'any' }, apiKeys: { [provider]: 'forged' } })),
    { action: 'figureStudioPlan', materials: 'x'.repeat(24_001), ...native },
    { action: 'figureStudioEdit', document: document(), instruction: '放大标签', objectIds: ['label-a'], baseRevision: 1, ...native },
  ]) {
    const response = await service.handle(request)
    assert.ok(response.code >= 400); assert.equal(response.requestState, 'not_sent'); assert.equal(response.billingStatus, 'not_called')
  }
  assert.equal(calls, 0)
})

test('editing validates selected-object scope, immutable source, unknown fields and actual indirect changes', async () => {
  const source = document(), before = JSON.stringify(source)
  const good = [{ type: 'update', id: 'label-a', patch: { fontSize: 7 } }]
  assert.deepEqual(validateFigureCommands(source, good, ['label-a'], 0), good)
  for (const commands of [
    [{ type: 'update', id: 'label-b', patch: { text: '越界' } }],
    [{ type: 'update', id: 'label-a', patch: { onclick: 'bad' } }],
    [{ type: 'update', id: 'label-a', patch: { id: 'renamed' } }],
    [{ type: 'remove', id: 'label-a' }],
  ]) assert.throws(() => validateFigureCommands(source, commands, ['label-a'], 0))
  assert.equal(JSON.stringify(source), before)
  const grouped = createDocument({ elements: [{ id: 'panel', type: 'panel', x: 0, y: 0, width: 100, height: 100 }, { id: 'child', type: 'text', parentId: 'panel', x: 5, y: 5, width: 10, height: 5, text: 'child' }] })
  assert.throws(() => validateFigureCommands(grouped, [{ type: 'update', id: 'panel', patch: { x: 20 } }], ['panel'], 0), /未选对象/)
  const service = createFigureStudioService({ supportedProviders: ['openai', 'tokendance', 'custom'], modelText: async (_b, system) => { assert.match(system, /fontSize uses points/); return JSON.stringify({ commands: [{ type: 'update', id: 'label-b', patch: { text: '越界' } }] }) } })
  const failed = await service.handle({ action: 'figureStudioEdit', document: source, instruction: '改字', objectIds: ['label-a'], baseRevision: 0, ...native })
  assert.equal(failed.code, 422); assert.equal(failed.billingStatus, 'unconfirmed'); assert.equal(JSON.stringify(source), before)
})

test('model timeout reports uncertainty, aborts once and never retries', async () => {
  let calls = 0, aborted = false
  const service = createFigureStudioService({ supportedProviders: ['openai'], modelTimeoutMs: 15, modelText: async (_b, _s, _u, signal) => { calls++; signal.addEventListener('abort', () => { aborted = true }); return new Promise(() => {}) } })
  const failed = await service.handle({ action: 'figureStudioPlan', materials: 'content', ...native })
  assert.equal(failed.code, 504); assert.equal(failed.requestState, 'unknown'); assert.equal(failed.billingStatus, 'unknown'); assert.equal(calls, 1); assert.equal(aborted, true)
})

test('successful edits return commands for the exact base revision without changing or saving the caller draft', async () => {
  const source = document(), before = JSON.stringify(source)
  const commands = [{ type: 'update', id: 'label-a', patch: { text: '新标签' } }]
  const service = createFigureStudioService({ supportedProviders: ['openai', 'tokendance', 'custom'], modelText: async () => JSON.stringify({ commands }) })
  const result = await service.handle({ action: 'figureStudioEdit', document: source, instruction: '把第一个标签改为新标签', objectIds: ['label-a'], baseRevision: source.revision, ...native })
  assert.deepEqual(result, { code: 0, commands, baseRevision: source.revision }); assert.equal(JSON.stringify(source), before)
})

test('model concurrency is bounded and excess requests are rejected before dispatch', async () => {
  let count = 0
  const releases: Array<(raw: string) => void> = []
  const service = createFigureStudioService({ supportedProviders: ['openai', 'tokendance', 'custom'], modelText: async () => { count++; return new Promise(resolve => releases.push(resolve)) } })
  const request = { action: 'figureStudioPlan', materials: 'content', ...native }
  const first = service.handle(request), second = service.handle(request)
  const busy = await service.handle(request)
  assert.equal(busy.code, 429); assert.equal(busy.requestState, 'not_sent'); assert.equal(count, 2)
  releases.forEach(resolve => resolve(JSON.stringify(plan)))
  assert.equal((await first).code, 0); assert.equal((await second).code, 0)
})

test('converter absence preserves SVG capability; invalid documents never reach converter', async () => {
  let calls = 0
  const service = createFigureStudioService({ runConverter: async () => { calls++; throw new Error('missing') } })
  const cap = await service.handle({ action: 'figureStudioCapabilities' })
  assert.deepEqual(cap.formats, { svg: true, pdf: false, eps: false }); assert.equal(cap.modelPlanning, false)
  assert.equal((await service.handle({ action: 'figureStudioExport', format: 'pdf', document: { svg: '<svg><image href="https://unsafe/" /></svg>' } })).code, 400)
  assert.equal((await service.handle({ action: 'figureStudioExport', format: 'pdf', document: document() })).code, 503)
  assert.equal(calls, 1)
})

test('export uses internal standalone SVG, page area and actual bytes; report leaves external editability manual', async () => {
  const dirs: string[] = [], fileBytes = pdfFixture
  const service = createFigureStudioService({ runConverter: async (_binary, args, options) => {
    dirs.push(options.cwd)
    if (args[0] === '--version') return
    assert.ok(args.includes('--export-area-page')); assert.ok(!args.includes('--export-text-to-path'))
    assert.ok(args.includes('--batch-process')); assert.ok(args.some(arg => arg.startsWith('--app-id-tag=tuyan-')))
    assert.equal((await stat(options.cwd)).mode & 0o777, 0o700)
    const svg = await readFile(args[0], 'utf8'); assert.match(svg, /<text\b/); assert.match(svg, /原标签/); assert.doesNotMatch(svg, /https?:\/\/(?!www.w3.org)/)
    assert.equal(svg, renderPdfSvg(document()))
    await writeFile(options.outputPath!, fileBytes)
  } })
  const result = await service.handle({ action: 'figureStudioExport', format: 'pdf', document: document() })
  assert.equal(result.code, 0, JSON.stringify(result)); assert.equal(result.file.mimeType, 'application/pdf')
  assert.deepEqual(Buffer.from(result.file.base64, 'base64'), fileBytes)
  assert.equal(result.verification.fileSha256, createHash('sha256').update(fileBytes).digest('hex'))
  assert.equal(result.verification.checks[0].status, 'passed'); assert.equal(result.verification.checks.find((check: any) => check.id === 'external-editor-compatibility').status, 'manual')
  assert.ok(!('editable' in result.verification)); for (const dir of dirs) await assert.rejects(stat(dir))
})

test('EPS subset repair is applied to actual returned bytes and hash while canonical source stays unchanged', async () => {
  const source = document(), before = JSON.stringify(source)
  const expected = Buffer.from(preserveEpsTextBoundaries(normalizeEpsFontSubsetNames(epsFixture).eps).eps, 'latin1')
  const service = createFigureStudioService({ runConverter: async (_binary, args, options) => {
    if (args[0] === '--version') return
    assert.equal(await readFile(args[0], 'utf8'), renderPrintSvg(source))
    await writeFile(options.outputPath!, epsFixture)
  } })
  const result = await service.handle({ action: 'figureStudioExport', format: 'eps', document: source })
  assert.equal(result.code, 0, JSON.stringify(result))
  assert.deepEqual(Buffer.from(result.file.base64, 'base64'), expected)
  assert.equal(result.verification.fileSha256, createHash('sha256').update(expected).digest('hex'))
  assert.equal(result.verification.byteLength, expected.length)
  assert.match(result.verification.checks.find((check: any) => check.id === 'external-editor-compatibility').message, /2 个重名/)
  assert.equal(result.verification.checks.find((check: any) => check.id === 'external-editor-compatibility').status, 'manual')
  assert.equal(JSON.stringify(source), before)
})

test('unsupported EPS fonts or malformed text boundaries fail closed and release conversion admission', async () => {
  let output = epsFixture
  const dirs: string[] = []
  const service = createFigureStudioService({ runConverter: async (_binary, args, options) => {
    if (args[0] === '--version') return
    dirs.push(options.cwd)
    await writeFile(options.outputPath!, output)
  } })
  const request = { action: 'figureStudioExport', format: 'eps', document: document() }
  for (const invalid of [epsFixture.replace('/FontType 42 def', '/FontType 3 def'), epsFixture.replace('\nBT\nET\n', '\nBT\nBT\nET\nET\n'), epsFixture.replace('\nET\n', '\n')]) {
    output = invalid
    const failed = await service.handle(request)
    assert.equal(failed.errorCode, 'FIGURE_STUDIO_EXPORT_INVALID'); assert.equal(failed.file, undefined)
  }
  output = epsFixture
  assert.equal((await service.handle(request)).code, 0)
  for (const dir of dirs) await assert.rejects(stat(dir))
})

test('only one conversion runs, alpha assets and unsupported effects fail without spawning', async () => {
  let release!: () => void, entered!: () => void
  const started = new Promise<void>(resolve => { entered = resolve })
  const service = createFigureStudioService({ runConverter: async (_b, args, options) => {
    if (args[0] === '--version') return
    entered(); await new Promise<void>(resolve => { release = resolve }); await writeFile(options.outputPath!, pdfFixture)
  } })
  const first = service.handle({ action: 'figureStudioExport', format: 'pdf', document: document() })
  await started
  assert.equal((await service.handle({ action: 'figureStudioExport', format: 'pdf', document: document() })).code, 429)
  release(); assert.equal((await first).code, 0)
  let calls = 0
  const rejecting = createFigureStudioService({ runConverter: async () => { calls++ } })
  const png = await sharp({ create: { width: 2, height: 2, channels: 4, background: '#ffffff00' } }).png().toBuffer()
  const alpha = createDocument({ assets: { picture: { mimeType: 'image/png', dataUrl: `data:image/png;base64,${png.toString('base64')}`, pixelWidth: 2, pixelHeight: 2 } }, elements: [{ id: 'image', type: 'image', assetId: 'picture', x: 0, y: 0, width: 10, height: 10 }] })
  assert.equal((await rejecting.handle({ action: 'figureStudioExport', format: 'eps', document: alpha })).errorCode, 'FIGURE_STUDIO_EPS_ALPHA')
  const effects: any = document(); effects.elements[0].opacity = 0.2
  assert.equal((await rejecting.handle({ action: 'figureStudioExport', format: 'pdf', document: effects })).code, 400)
  assert.equal(calls, 0)
})

test('valid raster headers with corrupt pixel data are rejected before converter, and the gate is released', async () => {
  const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#ffffff' } }).png().toBuffer()
  for (let offset = 8; offset + 12 <= png.length;) {
    const size = png.readUInt32BE(offset)
    if (png.subarray(offset + 4, offset + 8).toString() === 'IDAT') {
      png.fill(0, offset + 8, offset + 8 + size)
      let crc = 0xffffffff
      for (const byte of png.subarray(offset + 4, offset + 8 + size)) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0) }
      png.writeUInt32BE((crc ^ 0xffffffff) >>> 0, offset + 8 + size)
    }
    offset += 12 + size
  }
  // The portable document check validates the container; export must also decode pixels.
  const source = createDocument({ assets: { picture: { mimeType: 'image/png', dataUrl: `data:image/png;base64,${png.toString('base64')}`, pixelWidth: 2, pixelHeight: 2 } }, elements: [{ id: 'image', type: 'image', assetId: 'picture', x: 0, y: 0, width: 10, height: 10 }] })
  assert.equal((await sharp(png).metadata()).width, 2)
  let calls = 0
  const service = createFigureStudioService({ runConverter: async (_b, args, options) => { calls++; if (args[0] !== '--version') await writeFile(options.outputPath!, pdfFixture) } })
  const failed = await service.handle({ action: 'figureStudioExport', format: 'pdf', document: source })
  assert.equal(failed.errorCode, 'FIGURE_STUDIO_ASSET_INVALID'); assert.equal(calls, 0); assert.equal(failed.file, undefined)
  assert.equal((await service.handle({ action: 'figureStudioExport', format: 'pdf', document: document() })).code, 0)
})

test('exit-zero truncated PDF, forged EOF/xref and incomplete EPS are not accepted', () => {
  for (const raw of ['%PDF-1.5\n1 0 obj\n<< /Type /Font', '%PDF-1.5\n%%EOF', '%PDF-1.5\nstartxref\n99999\n%%EOF', '%PDF-1.5\nnotxref\nstartxref\n9\n%%EOF']) assert.equal(validateExportedFile(Buffer.from(raw), 'pdf'), false)
  assert.equal(validateExportedFile(Buffer.from('%!PS-Adobe-3.0 EPSF-3.0\n%%BoundingBox: 0 0 100 100\n'), 'eps'), false)
})

test('converter failures, wrong formats and EPS transparent canvas return no downloadable file and clean temp directories', async () => {
  const dirs: string[] = []
  const service = createFigureStudioService({ runConverter: async (_binary, args, options) => { dirs.push(options.cwd); if (args[0] !== '--version') await writeFile(options.outputPath!, 'not a PDF') } })
  const failed = await service.handle({ action: 'figureStudioExport', format: 'pdf', document: document() })
  assert.equal(failed.code, 502); assert.equal(failed.file, undefined)
  for (const dir of dirs) await assert.rejects(stat(dir))
  const alpha = createDocument({ canvas: { background: 'none' } })
  assert.equal((await service.handle({ action: 'figureStudioExport', format: 'eps', document: alpha })).errorCode, 'FIGURE_STUDIO_EPS_ALPHA')
  const timeout = createFigureStudioService({ runConverter: async (_b, args) => { if (args[0] !== '--version') throw new FigureStudioError(504, 'FIGURE_STUDIO_CONVERTER_TIMEOUT', '转换超时') } })
  assert.equal((await timeout.handle({ action: 'figureStudioExport', format: 'pdf', document: document() })).code, 504)
})

test('exit-zero converter without an output reports an export failure and releases its conversion gate', async () => {
  const dirs: string[] = []
  let createOutput = false
  const service = createFigureStudioService({ runConverter: async (_binary, args, options) => {
    dirs.push(options.cwd)
    if (args[0] !== '--version' && createOutput) await writeFile(options.outputPath!, pdfFixture)
  } })
  const failed = await service.handle({ action: 'figureStudioExport', format: 'pdf', document: document() })
  assert.equal(failed.code, 502)
  assert.equal(failed.errorCode, 'FIGURE_STUDIO_EXPORT_INVALID')
  assert.match(failed.error, /转换器未生成可读取的导出文件/)
  assert.equal(failed.requestState, 'not_sent')
  assert.equal(failed.billingStatus, 'not_called')
  assert.equal(failed.file, undefined)
  assert.equal(failed.failure, undefined)
  for (const dir of dirs) await assert.rejects(stat(dir))
  createOutput = true
  assert.equal((await service.handle({ action: 'figureStudioExport', format: 'pdf', document: document() })).code, 0)
})

test('output read guard preserves an explicit invalid-file FigureStudioError', async () => {
  const service = createFigureStudioService({ runConverter: async (_binary, args, options) => {
    if (args[0] !== '--version') await writeFile(options.outputPath!, '')
  } })
  const failed = await service.handle({ action: 'figureStudioExport', format: 'pdf', document: document() })
  assert.equal(failed.errorCode, 'FIGURE_STUDIO_EXPORT_INVALID')
  assert.equal(failed.error, '导出文件为空或超出大小限制。')
  assert.equal(failed.billingStatus, 'not_called')
  assert.equal(failed.file, undefined)
})

test('real subprocess runner kills a stalled process with a bounded timeout and strips secrets', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'tuyan-converter-test-'))
  try {
    await assert.rejects(runFigureConverter(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { cwd: dir, timeoutMs: 40 }), (error: any) => error.code === 'FIGURE_STUDIO_CONVERTER_TIMEOUT')
    await runFigureConverter(process.execPath, ['-e', 'if(Object.keys(process.env).some(k=>/KEY|TOKEN|SECRET/.test(k)))process.exit(3)'], { cwd: dir, timeoutMs: 3000 })
    await assert.rejects(runFigureConverter(process.execPath, ['-e', 'process.stdout.write("x".repeat(70000))'], { cwd: dir, timeoutMs: 3000 }), (error: any) => error.code === 'FIGURE_STUDIO_CONVERTER_OUTPUT')
  } finally { await rm(dir, { recursive: true, force: true }) }
})

test('Core rejects spoofed identity without gateway transport and requires authenticated user assertion', async () => {
  let calls = 0
  const server = createServer({ handler: async () => { throw new Error('legacy must not run') }, figureStudio: { async handle(body) { calls++; return { code: 0, identity: body.userId } } }, readinessProbe: async () => ({ ready: true }), healthSnapshot: () => ({ ready: true }), config: { gatewayToken: 'private-gateway', serviceName: 'test', version: 'test' }, logger: { info() {}, warn() {}, error() {} } })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  try {
    const port = (server.address() as any).port
    const post = (headers: Record<string, string>) => fetch(`http://127.0.0.1:${port}/paperbanana-api`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify({ action: 'figureStudioCapabilities', userId: 'forged-body' }) })
    assert.equal((await post({ 'x-paperbanana-auth-user-id': 'spoofed' })).status, 401)
    assert.equal((await post({ 'x-paperbanana-gateway-token': 'private-gateway' })).status, 401)
    const result = await post({ 'x-paperbanana-gateway-token': 'private-gateway', 'x-paperbanana-auth-user-id': 'actual-user' })
    assert.deepEqual(await result.json(), { code: 0, identity: 'actual-user' }); assert.equal(result.headers.get('cache-control'), 'no-store'); assert.equal(calls, 1)
  } finally { await new Promise<void>(resolve => server.close(() => resolve())) }
})

test('legacy native model adapter uses user key, exact registered main model and a single attempt', async () => {
  const fixture: any = await createRefineRuntime()
  try {
    const calls: Array<{ url: string; options: any }> = []
    fixture.legacy.configureRuntimeFetch(async (input: unknown, options: any) => { calls.push({ url: String(input), options }); return Response.json({ error: { message: 'fixture rejection' } }, { status: 503 }) })
    const signal = new AbortController().signal
    for (const bad of [{ ...native, apiKeys: {} }, { ...native, mainRoute: { accessProvider: 'openai', modelId: 'gpt-image-2' } }, { ...native, mainRoute: { accessProvider: 'tokendance', modelId: 'gpt-5.6-sol' } }]) await assert.rejects(fixture.legacy.figureStudioTextModel(bad, 'system', 'user', signal), (error: any) => error.requestState === 'not_sent')
    assert.equal(calls.length, 0)
    await assert.rejects(fixture.legacy.figureStudioTextModel(native, 'system', 'user', signal))
    assert.equal(calls.length, 1); assert.equal(calls[0].options.headers.Authorization, 'Bearer user-fixture-key'); assert.equal(JSON.parse(calls[0].options.body).model, 'gpt-5.6-sol'); assert.doesNotMatch(calls[0].url, /images/)
  } finally { await fixture.close() }
})
