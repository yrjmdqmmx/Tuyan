import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  applyThinkingSnapshot, compileThinkingSelection, normalizeThinkingConfiguration,
  thinkingProfile, validateThinkingOptions, validateThinkingTask,
} from '../../../packages/api/src/thinking.js'
import { THINKING_PROFILES } from '../../../packages/api/src/thinking-data.js'
import type { ThinkingOptions, ThinkingSelection } from '../../../packages/types/src/thinking.js'

type Role = 'main' | 'vision' | 'image'
const root = new URL('../../../', import.meta.url)
const audits = ['domestic', 'global'].map(name => JSON.parse(fs.readFileSync(new URL(`config/thinking-audit/${name}.json`, root), 'utf8')))
const sources: any[] = audits.flatMap(audit => audit.profiles)
const runtime: any[] = THINKING_PROFILES
const { STATIC_MODEL_REGISTRY: catalog } = await import(new URL('apps/web/src/lib/staticModelCatalog.js', root).href)
const values = (control: any): any[] => control.type === 'integer'
  ? [...new Set([control.min, control.max, control.default, ...(control.allowedSpecialValues || [])].filter(v => v !== null && v !== undefined))]
  : control.values.map((value: any) => typeof value === 'object' && value !== null ? value.value : value)
const get = (body: any, path: string): any => path.split('.').reduce((node, key) => node?.[key], body)
function put(body: any, path: string, value: unknown) {
  const keys = path.split('.'); let node = body
  for (const key of keys.slice(0, -1)) node = node[key] ??= {}
  node[keys.at(-1)!] = value
}
function selection(profile: any, options: ThinkingOptions = {}, modelId = profile.modelIds[0], protocol = profile.protocols[0]): ThinkingSelection {
  return { provider: profile.provider, modelId, protocol, ...(profile.regions ? { region: profile.regions[0] } : {}), options }
}
function profileFor(provider: string, modelId: string, role: Role = 'main') {
  const found = sources.find(p => p.provider === provider && p.modelIds.includes(modelId) && p.roles.includes(role))
  assert.ok(found, `${provider}/${modelId}/${role} audit fixture must exist`)
  return found
}
function localRejection(fn: () => unknown, label = '') {
  assert.throws(fn, (error: any) => error?.name === 'ThinkingConfigValidationError'
    && error.statusCode === 400 && error.businessCode === 'THINKING_CONFIG_INVALID'
    && error.localInputFailure === true && error.requestState === 'not_sent', label)
}
// Build companions from the independently checked audit, never from the validator under test.
function legalOptions(profile: any, control: any, value: any): ThinkingOptions {
  const options: ThinkingOptions = { [control.key]: value }
  const constraints = Array.isArray(profile.constraints) ? {} : profile.constraints || {}
  const mode = profile.controls.find((c: any) => c.key === 'mode')
  const budget = profile.controls.find((c: any) => c.key === 'budget')
  const enabled = mode && values(mode).find(v => v === true || v === 'enabled')
  if (control.conditions?.mode) options.mode = control.conditions.mode[0]
  if (control.key !== 'mode' && mode && (profile.budgetRequiresEnabled && control.key === 'budget'
    || constraints.budgetRequiresThinking && control.key === 'budget'
    || constraints.effortRequiresThinking && control.key === 'effort')) options.mode = enabled
  if (profile.requiresBudgetWhenEnabled && options.mode === 'enabled' && options.budget === undefined) options.budget = budget.min
  return options
}
function fixture(model: string) {
  return {
    model, max_tokens: 16384, max_output_tokens: 4096, quality: 'high', size: '1024x1024', n: 1,
    temperature: 0.6, top_p: 0.9, top_k: 40, reasoning_split: true,
    thinking: { preserve_thinking: true, clear_thinking: false },
    output_config: { format: { type: 'json_schema' } },
    parameters: { quality: 'high', n: 1 }, input: { prompt: 'scientific figure', quality: 'high' },
    settings: { quality: 'high' }, generationConfig: { maxOutputTokens: 4096 },
    generation_config: { image_config: { image_size: '2K' } },
  }
}

test('domestic and global audit profiles reach runtime without identity or control contract drift', () => {
  assert.equal(new Set(sources.map(p => p.id)).size, sources.length)
  assert.deepEqual(runtime.map(p => p.id).sort(), sources.map(p => p.id).sort())
  for (const audit of audits) for (const source of audit.profiles) {
    const target = runtime.find(p => p.id === source.id)
    for (const key of ['provider', 'modelIds', 'roles', 'protocols', 'regions', 'status', 'clearFields']) {
      assert.deepEqual(target[key], source[key], `${source.id}: ${key}`)
    }
    assert.equal(target.checkedAt, source.checkedAt || audit.checkedAt, source.id)
    assert.equal(target.controls.length, source.controls.length, source.id)
    for (const control of source.controls) {
      const actual = target.controls.find((c: any) => c.key === control.key)
      assert.ok(actual, `${source.id}: missing ${control.key}`)
      for (const [key, value] of Object.entries(control)) assert.deepEqual(actual[key], value, `${source.id}.${control.key}.${key}`)
    }
    for (const key of ['exclusiveEffortBudget', 'requiresBudgetWhenEnabled', 'budgetRequiresEnabled', 'invalidCombinations', 'budgetRelation', 'budgetOutputField', 'allowEffortWithoutThinking']) {
      if (source[key] !== undefined) assert.deepEqual(target[key], source[key], `${source.id}.${key}`)
    }
    assert.ok(source.sourceUrls?.length, `${source.id}: official evidence required even for unconfirmed rows`)
    assert.ok(['supported', 'unsupported', 'unconfirmed', 'fixed'].includes(source.status), source.id)
    if (source.status !== 'supported') assert.equal(source.controls.length, 0, source.id)
  }
})

test('every full static catalog provider/model/role/protocol has exactly one audited runtime disposition', t => {
  let models = 0, tuples = 0
  for (const [provider, registry] of Object.entries(catalog) as [string, any][]) for (const model of registry.models) {
    models++
    for (const role of model.roles as Role[]) {
      const protocol = model.roleProtocols?.[role] || model.protocol
      const matching = sources.filter(p => p.provider === provider && p.modelIds.includes(model.id) && p.roles.includes(role) && p.protocols.includes(protocol))
      assert.equal(matching.length, 1, `${provider}/${model.id}/${role}/${protocol}`)
      assert.equal(thinkingProfile(provider, model.id, role, protocol)?.id, matching[0].id)
      tuples++
    }
  }
  assert.ok(models > 0)
  assert.ok(tuples > models)
  t.diagnostic(`${Object.keys(catalog).length} static providers, ${models} models, ${tuples} role/protocol identities`)
  // Live OpenRouter models have their own audited directory rather than static catalog rows.
  const router = sources.filter(p => p.provider === 'openrouter')
  assert.ok(router.length > 0)
  for (const p of router) for (const id of p.modelIds) for (const role of p.roles) for (const protocol of p.protocols) {
    assert.equal(thinkingProfile('openrouter', id, role, protocol)?.id, p.id)
  }
})

test('each supported exact model/role/protocol maps every allowed enum value and budget boundary to audited wire fields', t => {
  const failures: string[] = []; let cases = 0, expectedCases = 0
  for (const p of sources.filter(p => p.status === 'supported')) for (const id of p.modelIds) for (const role of p.roles as Role[]) for (const protocol of p.protocols) {
    for (const control of p.controls) for (const value of values(control)) {
      expectedCases++
      const label = `${p.provider}/${id}/${role}/${protocol}: ${control.key}=${JSON.stringify(value)}`
      try {
        const options = legalOptions(p, control, value)
        const snapshot = compileThinkingSelection(selection(p, options, id, protocol), role)
        const expected = {}
        for (const [key, input] of Object.entries(options)) {
          const audited = p.controls.find((c: any) => c.key === key)
          put(expected, audited.field, audited.wireValues?.[String(input)] ?? input)
        }
        assert.deepEqual(snapshot.wire, expected, label)
        assert.deepEqual(snapshot.options, options, label)
        const body = fixture(id)
        const output = applyThinkingSnapshot(body, snapshot)
        for (const [key, input] of Object.entries(options)) {
          const audited = p.controls.find((c: any) => c.key === key)
          assert.deepEqual(get(output, audited.field), audited.wireValues?.[String(input)] ?? input, label)
        }
        assert.equal(output.max_tokens, 16384, label)
        assert.equal(output.max_output_tokens, 4096, label)
        assert.equal(output.quality, 'high', label)
        assert.equal(output.reasoning_split, true, label)
        cases++
      } catch (error: any) { failures.push(`${label}: ${error.message}`) }
    }
  }
  assert.deepEqual(failures, [], failures.slice(0, 25).join('\n'))
  assert.equal(cases, expectedCases)
  assert.ok(cases > 0)
  t.diagnostic(`${cases} exact model/role/protocol/control-value wire cases`)
})

test('explicit provider default sends no controls and clears audited fixed fields while legacy requests stay unchanged', () => {
  for (const p of sources) {
    const snapshot = compileThinkingSelection(selection(p), p.roles[0])
    assert.deepEqual(snapshot.wire, {}, p.id)
    assert.deepEqual(snapshot.options, {}, p.id)
    const fields = [...new Set<string>([...(p.clearFields || []), ...p.controls.map((c: any) => c.field)])]
    assert.deepEqual([...snapshot.clearFields].sort(), fields.sort(), p.id)
    const body = fixture(p.modelIds[0])
    for (const field of fields) put(body, field, '__legacy_fixed_value__')
    const before = structuredClone(body)
    assert.strictEqual(applyThinkingSnapshot(body), body, `${p.id}: no snapshot preserves legacy construction`)
    const output = applyThinkingSnapshot(body, snapshot)
    assert.deepEqual(body, before, `${p.id}: immutable input`)
    for (const field of fields) assert.equal(get(output, field), undefined, `${p.id}: ${field}`)
    for (const path of ['max_tokens', 'max_output_tokens', 'quality', 'size', 'n', 'reasoning_split', 'thinking.preserve_thinking', 'thinking.clear_thinking', 'parameters.quality', 'parameters.n', 'input.quality', 'settings.quality', 'output_config.format', 'generationConfig.maxOutputTokens', 'generation_config.image_config']) {
      assert.deepEqual(get(output, path), get(before, path), `${p.id}: preserve ${path}`)
    }
  }
  assert.deepEqual(normalizeThinkingConfiguration(undefined, {}), {})
  const qwen = profileFor('bailian', 'qwen3.8-max')
  assert.deepEqual(compileThinkingSelection(selection(qwen), 'main').wire, {}, 'default xhigh must not become an explicit 262144-token choice')
})

test('unconfirmed, fixed, unsupported, unknown identities and unknown control keys reject before sending', () => {
  for (const p of sources) {
    const runtimeProfile = thinkingProfile(p.provider, p.modelIds[0], p.roles[0], p.protocols[0])
    localRejection(() => validateThinkingOptions(runtimeProfile, { invented_thinking: 'high' }), p.id)
    if (p.status !== 'supported') localRejection(() => validateThinkingOptions(runtimeProfile, { mode: true }), p.id)
  }
  assert.equal(thinkingProfile('bailian', 'QWEN3.8-MAX', 'main', 'bailian-openai-chat'), undefined)
  assert.equal(thinkingProfile('tokendance', 'qwen3.8-max', 'main', 'openai-chat-completions')?.status, 'unconfirmed')
  assert.equal(thinkingProfile('bailian', 'qwen3.8-max', 'image', 'bailian-openai-chat'), undefined)
  assert.equal(thinkingProfile('bailian', 'qwen3.8-max', 'main', 'openai-chat-completions'), undefined)
  localRejection(() => validateThinkingOptions(undefined, { effort: 'high' }))
})

test('control types are strict: no boolean strings, coercion, fractional or unsafe budgets', () => {
  for (const p of sources.filter(p => p.status === 'supported')) for (const control of p.controls) {
    const runtimeProfile = thinkingProfile(p.provider, p.modelIds[0], p.roles[0], p.protocols[0])
    if (control.type === 'integer') {
      const invalid = ['1024', true, false, null, NaN, Infinity, -Infinity, 1024.5, Number.MAX_SAFE_INTEGER + 1, control.max + 1, -2]
      if (!(control.allowedSpecialValues || []).includes(control.min - 1)) invalid.push(control.min - 1)
      for (const value of invalid) localRejection(() => validateThinkingOptions(runtimeProfile, { [control.key]: value }), `${p.id}: ${String(value)}`)
    } else {
      const invalid = ['__invalid__', {}, [], null, ...[true, false, 'true', 'false', 0, 1].filter(v => !values(control).includes(v))]
      for (const value of invalid) localRejection(() => validateThinkingOptions(runtimeProfile, { [control.key]: value }), `${p.id}: ${JSON.stringify(value)}`)
    }
  }
  for (const options of [null, [], 'high', true, 1024]) localRejection(() => validateThinkingOptions(runtime[0], options))
})

test('task configuration rejects stale identity, unknown roles/fields and client wire injection', () => {
  const p = profileFor('bailian', 'qwen3.8-max')
  const row = selection(p, { effort: 'low' }, 'qwen3.8-max')
  const identities = { main: { provider: row.provider, modelId: row.modelId, protocol: row.protocol } }
  const valid = { version: 1, roles: { main: row } }
  assert.equal(normalizeThinkingConfiguration(valid, identities).thinkingSnapshot?.roles.main?.wire.reasoning_effort, 'low')
  for (const change of [{ provider: 'tokendance' }, { modelId: 'qwen3.8-flash' }, { protocol: 'openai-chat-completions' }, { region: 'unverified-region' }, { wire: { max_tokens: 999999 } }, { options: { budget: '1024' } }]) {
    localRejection(() => normalizeThinkingConfiguration({ version: 1, roles: { main: { ...row, ...change } } }, identities))
  }
  for (const invalid of [{ ...valid, version: 2 }, { ...valid, wire: {} }, { ...valid, roles: { other: row } }, { ...valid, roles: [] }, { ...valid, roles: { main: null } }]) {
    localRejection(() => normalizeThinkingConfiguration(invalid, identities))
  }
})

test('effort/budget exclusivity, enabled requirements and adaptive conflicts follow each audited model', () => {
  const qwen = profileFor('bailian', 'qwen3.8-max'), qwenRuntime = thinkingProfile('bailian', 'qwen3.8-max', 'main', qwen.protocols[0])
  localRejection(() => validateThinkingOptions(qwenRuntime, { mode: true, effort: 'low', budget: 4096 }))
  localRejection(() => validateThinkingOptions(qwenRuntime, { mode: false, effort: 'low' }))
  localRejection(() => validateThinkingOptions(qwenRuntime, { mode: false, budget: 4096 }))
  const claude = profileFor('anthropic', 'claude-sonnet-4-6'), claudeRuntime = thinkingProfile('anthropic', 'claude-sonnet-4-6', 'main', claude.protocols[0])
  localRejection(() => validateThinkingOptions(claudeRuntime, { mode: 'adaptive', budget: 1024 }))
  localRejection(() => validateThinkingOptions(claudeRuntime, { mode: 'enabled' }))
  localRejection(() => validateThinkingOptions(claudeRuntime, { budget: 1024 }))
  assert.deepEqual(validateThinkingOptions(claudeRuntime, { mode: 'disabled', effort: 'high' }), { mode: 'disabled', effort: 'high' })
  const opus = profileFor('anthropic', 'claude-opus-5'), opusRuntime = thinkingProfile('anthropic', 'claude-opus-5', 'main', opus.protocols[0])
  localRejection(() => validateThinkingOptions(opusRuntime, { mode: 'disabled', effort: 'max' }))
  const snapshot = compileThinkingSelection(selection(claude, { mode: 'enabled', budget: 1024 }), 'main')
  for (const max_tokens of [1024, 1023]) localRejection(() => applyThinkingSnapshot({ max_tokens }, snapshot))
  assert.equal(applyThinkingSnapshot({ max_tokens: 1025 }, snapshot).max_tokens, 1025)
})

test('Gemini special budget values are model specific and stay numeric on the wire', () => {
  for (const id of ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro']) {
    const p = profileFor('gemini', id)
    for (const budget of id.endsWith('-pro') ? [-1, 128] : [-1, 0]) {
      const snapshot = compileThinkingSelection(selection(p, { budget }), 'main')
      const output = applyThinkingSnapshot({ generationConfig: { maxOutputTokens: 4096 } }, snapshot)
      assert.equal(output.generationConfig.thinkingConfig.thinkingBudget, budget)
      assert.equal(output.generationConfig.maxOutputTokens, 4096)
    }
    if (id.endsWith('-pro')) localRejection(() => compileThinkingSelection(selection(p, { budget: 0 }), 'main'))
    localRejection(() => compileThinkingSelection(selection(p, { budget: -2 }), 'main'))
  }
})

test('WAN image thinking refuses reference images, editing and image-set requests without changing quality', () => {
  for (const [provider, ids] of [
    ['bailian', ['wan2.7-image', 'wan2.7-image-pro']],
    ['replicate', ['wan-video/wan-2.7-image', 'wan-video/wan-2.7-image-pro']],
    ['runware', ['alibaba:wan@2.7-image', 'alibaba:wan@2.7-image-pro']],
  ] as const) for (const id of ids) {
    const p = profileFor(provider, id, 'image')
    const snapshot = compileThinkingSelection(selection(p, { mode: true }, id), 'image')
    const taskSnapshot = { version: 1 as const, roles: { image: snapshot } }
    assert.equal(applyThinkingSnapshot({ model: id, quality: 'high', input: { images: [] } }, snapshot).quality, 'high')
    localRejection(() => validateThinkingTask(taskSnapshot, { action: 'refineImage' }), `${provider}/${id}: editing`)
    localRejection(() => validateThinkingTask(taskSnapshot, { referenceImages: [{ objectKey: 'fixture' }] }), `${provider}/${id}: references`)
    localRejection(() => validateThinkingTask(taskSnapshot, { retrievalSetting: 'auto' }), `${provider}/${id}: retrieval`)
    const blockedBodies = provider === 'runware'
      ? [{ inputs: { referenceImages: ['https://fixtures.example/source.png'] } }, { settings: { sequential: true } }]
      : provider === 'replicate'
        ? [{ input: { images: ['https://fixtures.example/source.png'] } }, { input: { image_set_mode: true } }]
        : [{ input: { messages: [{ content: [{ image: 'https://fixtures.example/source.png' }] }] } }, { parameters: { enable_sequential: true } }]
    for (const body of blockedBodies) localRejection(() => applyThinkingSnapshot(body, snapshot), `${provider}/${id}: ${JSON.stringify(body)}`)
    const defaultSnapshot = compileThinkingSelection(selection(p, {}, id), 'image')
    assert.doesNotThrow(() => applyThinkingSnapshot({ input: { images: ['https://fixtures.example/source.png'] } }, defaultSnapshot))
    assert.doesNotThrow(() => validateThinkingTask({ version: 1, roles: { image: defaultSnapshot } }, { action: 'refineImage' }))
  }
})
