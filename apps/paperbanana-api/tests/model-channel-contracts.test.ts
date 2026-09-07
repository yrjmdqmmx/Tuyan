import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { buildImageChannelBody, type ImageChannelInput } from '../../../packages/api/src/image-channel-adapters.js'
import { resolveImageSize } from '../../../packages/types/src/image-size-contract.js'
import { IMAGE_CHANNEL_ROUTES } from '../../../packages/api/src/image-channel-routes.js'
// @ts-ignore Generated browser catalog is deliberately also consumed by the backend tests.
import { STATIC_MODEL_REGISTRY } from '../../web/src/lib/staticModelCatalog.js'

const read = (name: string) => JSON.parse(fs.readFileSync(new URL('../../../config/' + name + '.json', import.meta.url), 'utf8'))
const dimensions = read('image-size-contracts')
const schemas = read('model-channel-schemas')
const updates = read('model-catalog-updates')

/** Validate against the captured provider schema, independently of our wire formatter. */
function validate(value: any, schema: any, defs: any, path: string): void {
  if (schema.$ref) return validate(value, {...defs[schema.$ref.split('/').at(-1)], ...Object.fromEntries(Object.entries(schema).filter(([k]) => k !== '$ref'))}, defs, path)
  if (value === null && schema.nullable) return
  // Replicate GPT Image 1.5 publishes items.type=string with an empty anyOf.
  // Its documented list-of-image-URIs contract supplies the usable type.
  if (schema.anyOf?.length || schema.oneOf?.length) {
    const alternatives = schema.anyOf || schema.oneOf
    assert.ok(alternatives.some((alternative: any) => { try { validate(value, alternative, defs, path); return true } catch { return false } }), path + ' does not match any schema alternative')
    return
  }
  for (const part of schema.allOf || []) validate(value, part, defs, path)
  if (schema.enum) assert.ok(schema.enum.includes(value), path + ' is outside the official enum: ' + JSON.stringify(value))
  const types = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : []
  if (types.length) assert.ok(types.some((type: string) => type === 'array' ? Array.isArray(value) : type === 'integer' ? Number.isInteger(value) : type === 'null' ? value === null : typeof value === type), path + ' has the wrong type')
  if (typeof value === 'number') {
    if (schema.minimum !== undefined) assert.ok(value >= schema.minimum, path + ' below minimum')
    if (schema.maximum !== undefined) assert.ok(value <= schema.maximum, path + ' above maximum')
    if (typeof schema.exclusiveMinimum === 'number') assert.ok(value > schema.exclusiveMinimum, path)
    if (schema.multipleOf) assert.equal(value % schema.multipleOf, 0, path + ' alignment')
  }
  if (typeof value === 'string') {
    if (schema.minLength !== undefined) assert.ok([...value].length >= schema.minLength, path)
    if (schema.maxLength !== undefined) assert.ok([...value].length <= schema.maxLength, path)
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined) assert.ok(value.length >= schema.minItems, path + ' too few reference images')
    if (schema.maxItems !== undefined) assert.ok(value.length <= schema.maxItems, path + ' too many reference images')
    if (schema.items) value.forEach((item, i) => validate(item, schema.items, defs, path + '[' + i + ']'))
  } else if (value && typeof value === 'object') {
    for (const required of schema.required || []) assert.ok(required in value, path + ' missing required field ' + required)
    for (const [key, item] of Object.entries(value)) {
      assert.ok(schema.properties?.[key] || schema.additionalProperties, path + ' sends an undocumented field ' + key)
      if (schema.properties?.[key]) validate(item, schema.properties[key], defs, path + '.' + key)
    }
  }
}

test('all platform image selections produce requests satisfying the independent official input schemas', async (t) => {
  let combinations = 0, operations = 0
  for (const [key, route] of Object.entries(IMAGE_CHANNEL_ROUTES)) {
    const provider = key.slice(0, key.indexOf('/')), modelId = key.slice(key.indexOf('/') + 1)
    const model = STATIC_MODEL_REGISTRY[provider].models.find((m: any) => m.id === modelId)
    assert.ok(model, key)
    for (const operation of ['generation', 'editing']) {
      const wire = route[operation]
      if (!wire) continue
      const evidence = schemas[provider + '/' + wire.endpoint]
      if (!evidence) { assert.ok(!['fal','replicate'].includes(provider), key + ' missing schema evidence'); continue }
      const contract = dimensions.profiles[dimensions.routes[key][operation]]
      const map = model.capabilities[operation === 'generation' ? 'aspectRatiosByResolution' : 'refineAspectRatiosByResolution']
      operations++
      for (const [resolution, ratios] of Object.entries(map) as [string, string[]][]) for (const ratio of ['auto', ...ratios]) {
        const input: ImageChannelInput = {provider, model:modelId, apiKey:'fixture-only', prompt:'Scientific figure with a clear legend', resolution, aspectRatio:ratio, size:resolveImageSize(contract,ratio,resolution), source:operation==='editing'?{base64:'c291cmNl',mimeType:'image/png',dataUrl:'data:image/png;base64,c291cmNl'}:null}
        const body = await buildImageChannelBody(input, wire, {publicSource:async()=> 'https://fixture.invalid/source.png'})
        validate(body, evidence.input, evidence.schemas, `${key}/${operation}/${resolution}/${ratio}`)
        if (provider === 'replicate' && !evidence.official) assert.equal(wire.version, evidence.version, 'Community predictions must pin the inspected version')
        combinations++
      }
      if (wire.maxPromptLength) await assert.rejects(buildImageChannelBody({provider,model:modelId,apiKey:'fixture',prompt:'文'.repeat(wire.maxPromptLength+1),resolution:'auto',aspectRatio:'auto',size:{}},wire,{publicSource:async()=>''}), /prompt exceeds/)
    }
  }
  t.diagnostic(`${operations} operations; ${combinations} selections matched official schema snapshots`)
  assert.ok(operations > 100)
})

test('catalog lifecycle and regional corrections are present without advertising retired direct models', () => {
  const get = (provider: string, id: string) => STATIC_MODEL_REGISTRY[provider].models.find((m: any) => m.id===id)
  assert.equal(get('openai','o3-pro').protocol,'openai-responses')
  assert.equal(get('openai','o3-pro').expirationDate,'2026-12-11')
  assert.equal(get('openai','gpt-4').roles.includes('vision'),false)
  assert.equal(get('siliconflow','Qwen/Qwen3.5-397B-A17B').expirationDate,'2026-09-11')
  assert.equal(get('together','Qwen/Qwen3.5-397B-A17B'),undefined)
  assert.equal(get('bailian','qwen-image-edit').capabilities.requiresSourceImage,true)
  assert.equal(get('fireworks','accounts/fireworks/models/minimax-m3').roles.includes('vision'),false)
  assert.equal(get('fireworks','accounts/fireworks/models/kimi-k3').roles.includes('vision'),true)
  assert.equal(get('gemini','imagen-4.0-generate-001'),undefined)
  assert.ok(get('replicate','google/imagen-4'))
  assert.equal(updates.channels.minimax.label,'MiniMax')
  assert.deepEqual(get('minimax','image-01-live').regions,['cn'])
})
