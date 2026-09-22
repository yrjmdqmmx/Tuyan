import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { AUDITED_CHANNEL_CONTRACTS } from '../../../packages/api/src/audited-channel-data.js'
import { assertChannelRequest } from '../../../packages/api/src/audited-channel-contracts.js'
import { buildAuditedTextBody, callNewTextChannel, type NewTextInput } from '../../../packages/api/src/text-channel-adapters.js'
import type { ImageChannelCheckpoint, ImageChannelTransport } from '../../../packages/api/src/image-channel-adapters.js'
import { MODEL_CHANNEL_LABELS, modelDeveloper, modelDeveloperName, orderModelChannels } from '../../../packages/types/src/model-presentation.js'
// @ts-ignore Generated browser catalog is deliberately consumed independently of the config generator.
import { STATIC_MODEL_REGISTRY, EXTENDED_MODEL_CHANNELS } from '../../web/src/lib/staticModelCatalog.js'
// @ts-ignore Exercise the actual generated Web selection gate at the same lifecycle boundary.
import { modelUnavailableForSelection } from '../../web/src/lib/modelRegistry.js'

const providers = ['sensenova', 'stepfun', 'qianfan', 'iflytek', 'longcat'] as const
type Provider = typeof providers[number]
const root = new URL('../../../', import.meta.url)
const read = (path: string) => JSON.parse(fs.readFileSync(new URL(path, root), 'utf8'))
const audits = Object.fromEntries(providers.map(provider => [provider, read(`config/channel-audit/v24/${provider}.json`)])) as Record<Provider, any>
const integrations = Object.fromEntries(providers.map(provider => [provider, read(`config/channel-audit/v24/${provider}-integration.json`)])) as Record<Provider, any>
const config = read('config/model-catalog-updates.json')
const presentation = read('config/model-presentation.json')
const auditTime = Date.parse('2026-09-22T12:00:00+08:00')
const image = { url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB' }
const roleSet = (roles: string[]) => [...new Set(roles.map(role => role.startsWith('image-') ? 'image' : role))].sort()
const ids = (rows: any[]) => rows.map(row => row.id).sort()
const notSent = (error: any) => error.localInputFailure === true && error.requestState === 'not_sent'
const textInput = (provider: Provider, model: any, withImage = model.roles.includes('vision')): NewTextInput => ({ provider, model: model.id, apiKey: 'fixture-only-secret', system: '保留科研事实', user: '说明节点之间的关系', images: withImage ? [image] : [] })

for (const provider of providers) {
  test(`v24 ${provider}: every selected identity and role equals the audit, Web catalog and generated contract`, t => {
    t.mock.method(Date, 'now', () => auditTime)
    const integration = integrations[provider], audit = audits[provider]
    const selected = integration.models as any[], web = STATIC_MODEL_REGISTRY[provider].models as any[]
    assert.equal(integration.provider, provider); assert.equal(integration.checkedAt.slice(0, 10), audit.checkedAt.slice(0, 10))
    assert.equal(new Set(selected.map(row => row.id)).size, selected.length, 'duplicate integration ID')
    assert.deepEqual(ids(web), ids(selected), 'Web must contain every selected ID and no additional IDs')
    assert.deepEqual(ids(config.providers[provider]), ids(selected), 'shared catalog must equal the integration list')
    const contractIds = Object.keys(AUDITED_CHANNEL_CONTRACTS).filter(key => key.startsWith(provider + '/')).map(key => key.slice(provider.length + 1)).sort()
    assert.deepEqual(contractIds, ids(selected), 'no omitted or extra executable contracts')
    for (const row of selected) {
      const source = audit.models.find((model: any) => model.id === row.id)
      const rendered = web.find(model => model.id === row.id)
      const contract = AUDITED_CHANNEL_CONTRACTS[provider + '/' + row.id]
      assert.ok(source, `${row.id}: missing independent official audit`)
      assert.deepEqual(roleSet(row.roles), roleSet(source.roles), `${row.id}: integration inferred an unaudited role`)
      assert.deepEqual(roleSet(rendered.roles), roleSet(row.roles), `${row.id}: Web roles`)
      assert.deepEqual(roleSet(contract.roles), roleSet(row.roles), `${row.id}: executable roles`)
      assert.deepEqual(Object.keys(rendered.roleProtocols).sort(), roleSet(row.roles), `${row.id}: role protocol leakage`)
      assert.equal(row.apiId, source.id, `${row.id}: API identity must not be silently rewritten`)
      assert.equal(modelUnavailableForSelection(rendered), false, row.id)
      assert.equal(row.realInference, false); assert.equal(row.accountEntitlement, false); assert.equal(row.billingVerified, false)
      assert.equal(rendered.verified, false); assert.equal(rendered.verificationState, 'catalog')
    }
    // The same ID may be excluded only in a different account/region/plan scope.
    // Exact set equality above catches every accidental extra, including trimmed legacy IDs.
    const selectedIds = new Set(selected.map(row => row.id))
    const excluded = [...(audit.excluded || []), ...audit.models.filter((row: any) => !selectedIds.has(row.id)), ...(integration.excluded || [])]
    for (const row of excluded) if (typeof row.id === 'string' && !selectedIds.has(row.id)) {
      assert.equal(web.some(model => model.id === row.id), false, `${provider}/${row.id}: excluded model visible`)
      assert.equal(AUDITED_CHANNEL_CONTRACTS[provider + '/' + row.id], undefined, `${provider}/${row.id}: excluded model executable`)
    }
    for (const role of ['main', 'vision', 'image']) {
      const value = STATIC_MODEL_REGISTRY[provider].defaults[role]
      assert.ok(!value || selected.some(row => row.id === value && row.roles.includes(role)), `${provider}: invalid ${role} default`)
    }
  })
}

test('v24 coverage totals are calculated from every manifest, with overlapping roles counted separately', t => {
  const expected = { models: 0, main: 0, vision: 0, image: 0 }, actual = { ...expected }
  for (const provider of providers) {
    expected.models += integrations[provider].models.length
    actual.models += STATIC_MODEL_REGISTRY[provider].models.length
    for (const role of ['main', 'vision', 'image'] as const) {
      expected[role] += integrations[provider].models.filter((row: any) => row.roles.includes(role)).length
      actual[role] += STATIC_MODEL_REGISTRY[provider].models.filter((row: any) => row.roles.includes(role)).length
    }
  }
  assert.deepEqual(actual, expected)
  t.diagnostic(`${expected.models} distinct provider/model pairs; ${expected.main + expected.vision + expected.image} role assignments: main=${expected.main}, vision=${expected.vision}, image=${expected.image}`)
})

for (const provider of ['qianfan', 'sensenova', 'stepfun'] as const) {
  for (const selected of integrations[provider].models.filter((model: any) => model.roles.some((role: string) => role === 'main' || role === 'vision'))) {
    test(`v24 official text wire: ${provider}/${selected.id}`, async t => {
      t.mock.method(Date, 'now', () => auditTime)
      const source = audits[provider].models.find((model: any) => model.id === selected.id)
      const contract = AUDITED_CHANNEL_CONTRACTS[provider + '/' + selected.id]
      const input = textInput(provider, selected)
      const body = buildAuditedTextBody(input)
      assert.equal(body.model, source.id)
      assert.equal(contract.textEndpoint, source.request.endpoint, 'ordinary account endpoint must match the official audit')
      assert.equal(contract.textProtocol, source.protocol)
      assert.equal(contract.systemMode, source.request.systemMode || 'system')
      for (const [field, value] of Object.entries(source.request.constants)) assert.deepEqual(body[field], value, `${selected.id}.${field}`)
      if (source.request.defaultMaxTokens !== undefined) assert.equal(body.max_tokens, source.request.defaultMaxTokens)
      const outputField = source.request.maxOutputField || 'max_tokens'
      assert.equal(typeof body[outputField], 'number', `${selected.id}: documented output limit field`)
      if (outputField === 'max_completion_tokens') assert.equal('max_tokens' in body, false)
      if (source.limits?.maxOutputTokens) assert.ok(body[outputField] <= source.limits.maxOutputTokens, 'output exceeds official maximum')
      assert.equal('response_format' in body, false, 'prompt JSON must not imply a universal response-format contract')
      const content = body.messages.at(-1).content
      if (input.images.length) {
        assert.ok(Array.isArray(content)); assert.deepEqual(content.filter((part: any) => part.type === 'image_url').map((part: any) => part.image_url.url), [image.url])
      } else assert.equal(typeof content, 'string')
      if (source.request.systemMode === 'user-prefix') {
        assert.deepEqual(body.messages.map((message: any) => message.role), ['user'])
        assert.ok(JSON.stringify(content).includes(input.system))
      } else assert.deepEqual(body.messages.map((message: any) => message.role), ['system', 'user'])

      let checkpoint: ImageChannelCheckpoint | undefined
      const calls: Array<{ url: string; body: any }> = []
      const io: Pick<ImageChannelTransport, 'request' | 'json' | 'sleep' | 'now' | 'pending' | 'checkpoint'> = {
        pending: async () => checkpoint, checkpoint: async value => { checkpoint = structuredClone(value) }, now: () => auditTime, sleep: async () => {},
        request: async (url, init, _label, attempts) => {
          assert.ok(checkpoint?.state.submitting, 'durable marker required before any model POST')
          assert.equal(url, source.request.endpoint); assert.equal(init.method, source.request.method); assert.equal(attempts, 1)
          assert.equal(init.redirect, 'error'); assert.equal(new Headers(init.headers).get('Authorization'), 'Bearer fixture-only-secret')
          const sent = JSON.parse(String(init.body)); calls.push({ url, body: sent }); assert.deepEqual(sent, body)
          return sent.stream
            ? new Response('data: {"choices":[{"index":0,"delta":{"content":"fixture result"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n', { headers: { 'Content-Type': 'text/event-stream' } })
            : Response.json({ id: 'fixture-id', choices: [{ finish_reason: 'stop', message: { content: 'fixture result' } }] })
        },
        json: async response => response.json(),
      }
      assert.equal(await callNewTextChannel(input, io), 'fixture result')
      assert.equal(calls.length, 1)
    })
  }
}

test('every vision-only selection requires an image, and text-only models reject image input', t => {
  t.mock.method(Date, 'now', () => auditTime)
  let visionOnly = 0
  for (const provider of providers) for (const selected of integrations[provider].models) {
    if (selected.roles.includes('vision') && !selected.roles.includes('main')) {
      visionOnly++
      assert.throws(() => buildAuditedTextBody(textInput(provider, selected, false)), notSent, provider + '/' + selected.id)
      assert.doesNotThrow(() => buildAuditedTextBody(textInput(provider, selected, true)))
    } else if (selected.roles.includes('main') && !selected.roles.includes('vision')) {
      assert.throws(() => buildAuditedTextBody(textInput(provider, selected, true)), notSent, provider + '/' + selected.id)
    }
  }
  assert.ok(visionOnly > 0, 'vision-only negative coverage must not be vacuous')
})

test('DeepSeek OCR remains one user message, one image and no generic thinking or JSON fields', t => {
  t.mock.method(Date, 'now', () => auditTime)
  const selected = integrations.qianfan.models.find((row: any) => row.id === 'deepseek-ocr')
  const source = audits.qianfan.models.find((row: any) => row.id === selected.id)
  const input = textInput('qianfan', selected)
  const body = buildAuditedTextBody(input)
  assert.equal(source.request.singleTurn, true)
  assert.deepEqual(body.messages.map((message: any) => message.role), source.request.messageRoles)
  for (const field of source.request.omitFields.filter((field: string) => !field.includes(' '))) assert.equal(field in body, false, field)
  assert.throws(() => buildAuditedTextBody({ ...input, images: [image, image] }), notSent)
})

test('Qianfan stream flags follow each official SKU, including mandatory streaming when audited', t => {
  t.mock.method(Date, 'now', () => auditTime)
  let mandatoryStreaming = 0
  for (const selected of integrations.qianfan.models.filter((row: any) => row.roles.some((role: string) => role === 'main' || role === 'vision'))) {
    const source = audits.qianfan.models.find((row: any) => row.id === selected.id)
    const body = buildAuditedTextBody(textInput('qianfan', selected))
    if (source.limits.streamOnly === true) { mandatoryStreaming++; assert.equal(body.stream, true, selected.id) }
    assert.equal(body.stream, source.request.constants.stream, selected.id)
  }
  t.diagnostic(`${mandatoryStreaming} selected Qianfan SKUs have an audited streamOnly=true requirement; no model is guessed from its name`)
})

test('model-specific prohibition of remote image URLs is enforced before any submission', t => {
  t.mock.method(Date, 'now', () => auditTime)
  let checked = 0
  for (const provider of ['qianfan', 'sensenova', 'stepfun'] as const) for (const selected of integrations[provider].models) {
    const source = audits[provider].models.find((row: any) => row.id === selected.id)
    if (!selected.roles.includes('vision') || source.request.visionEncoding?.publicUrl !== false) continue
    checked++
    assert.throws(() => buildAuditedTextBody({ ...textInput(provider, selected), images: [{ url: 'https://asset.invalid/figure.png' }] }), notSent, provider + '/' + selected.id)
  }
  assert.ok(checked > 0)
})

test('September 29 and October 10 retirement gates use Beijing midnight and preserve the exact model ID', t => {
  let now = auditTime; t.mock.method(Date, 'now', () => now)
  const dates = new Set<string>()
  for (const provider of ['qianfan', 'stepfun'] as const) for (const selected of integrations[provider].models) {
    const source = audits[provider].models.find((row: any) => row.id === selected.id)
    const date = source.lifecycle?.retirementDate
    if (!date) continue
    dates.add(date)
    const cutoff = Date.parse(`${date}T00:00:00+08:00`)
    const contract = AUDITED_CHANNEL_CONTRACTS[provider + '/' + selected.id]
    const rendered = STATIC_MODEL_REGISTRY[provider].models.find((row: any) => row.id === selected.id)
    assert.equal(Date.parse(contract.expiresAt), cutoff)
    assert.equal(Date.parse(rendered.expirationAt), cutoff)
    const catalogRow = config.providers[provider].find((row: any) => row.id === selected.id)
    assert.equal(Date.parse(catalogRow.metadata.expirationAt), cutoff)
    const body = selected.roles.includes('image') ? { model: selected.id, prompt: 'fixture' } : { model: selected.id, messages: [{ role: 'user', content: 'fixture' }] }
    now = cutoff - 1
    assert.doesNotThrow(() => assertChannelRequest(contract, body), provider + '/' + selected.id)
    assert.equal(modelUnavailableForSelection(rendered), false)
    for (const instant of [cutoff, cutoff + 1, cutoff + 86400000]) {
      now = instant
      assert.throws(() => assertChannelRequest(contract, body), notSent, provider + '/' + selected.id)
      assert.equal(modelUnavailableForSelection(rendered), true)
      assert.equal(rendered.id, selected.id, 'retirement must not silently replace the identity')
    }
  }
  assert.deepEqual([...dates].sort(), ['2026-09-29', '2026-10-10'])
})

test('five channels retain domestic direct classification and MiniMax keeps service-owner and model-brand identities', () => {
  for (const provider of providers) {
    assert.equal(EXTENDED_MODEL_CHANNELS[provider].accessKind, 'direct')
    assert.equal(STATIC_MODEL_REGISTRY[provider].accessKind, 'direct')
    assert.equal(MODEL_CHANNEL_LABELS[provider], config.channels[provider].label)
  }
  assert.deepEqual(orderModelChannels(['runware', 'qianfan', 'tokenhub', 'longcat', 'openai', 'sensenova', 'stepfun', 'iflytek', 'minimax']), ['tokenhub', 'qianfan', 'longcat', 'sensenova', 'stepfun', 'iflytek', 'minimax', 'openai', 'runware'])
  assert.equal(EXTENDED_MODEL_CHANNELS.minimax.label, '稀宇科技')
  assert.equal(MODEL_CHANNEL_LABELS.minimax, '稀宇科技')
  assert.equal(modelDeveloperName('minimax'), 'MiniMax')
  assert.equal(presentation.vendors.minimax.legalName, '上海稀宇科技有限公司')
  const hosted = STATIC_MODEL_REGISTRY.iflytek.models.find((row: any) => row.id === 'xminimaxm25')
  assert.ok(hosted); assert.equal(modelDeveloper('iflytek', hosted).id, 'minimax')
  assert.equal(hosted.id, 'xminimaxm25', 'hosted exact API ID must remain unchanged')
})
