import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { AUDITED_CHANNEL_CONTRACTS } from '../../../../packages/api/src/audited-channel-data.js'
// @ts-ignore Independent generated catalog consumer.
import { STATIC_MODEL_REGISTRY as catalog } from '../../../web/src/lib/staticModelCatalog.js'

const read = (name: string) => JSON.parse(readFileSync(new URL('../../../../config/' + name + '.json', import.meta.url), 'utf8'))
const removed = read('removed-models')
const config = read('model-catalog-updates')

// Frozen R5 oracle: enumerate every removal, so counts cannot drift with the implementation.
const retirementGroups = [
  {
    stopDate: "2026-10-10", sourceUrl: "https://help.aliyun.com/zh/model-studio/model-depreciation",
    keys: [
      "bailian/MiniMax-M2.1",
      "bailian/MiniMax/MiniMax-M2.1",
      "bailian/Moonshot-Kimi-K2-Instruct",
      "bailian/deepseek-r1",
      "bailian/deepseek-r1-0528",
      "bailian/deepseek-r1-distill-qwen-14b",
      "bailian/deepseek-r1-distill-qwen-32b",
      "bailian/deepseek-r1-distill-qwen-7b",
      "bailian/deepseek-v3",
      "bailian/deepseek-v3.1",
      "bailian/deepseek-v3.2",
      "bailian/deepseek-v3.2-exp",
      "bailian/deepseek-v4-flash",
      "bailian/glm-4.5",
      "bailian/glm-4.5-air",
      "bailian/glm-4.7",
      "bailian/kimi-k2-thinking",
      "bailian/qvq-max",
      "bailian/qvq-plus",
      "bailian/qwen-image-edit",
      "bailian/qwen-image-edit-max",
      "bailian/qwen-image-edit-max-2026-01-16",
      "bailian/qwen-image-edit-plus",
      "bailian/qwen-image-edit-plus-2025-10-30",
      "bailian/qwen-image-edit-plus-2025-12-15",
      "bailian/qwen-image-max",
      "bailian/qwen-image-max-2025-12-30",
      "bailian/qwen-image-plus",
      "bailian/qwen-image-plus-2026-01-09",
      "bailian/qwen-long-2025-01-25",
      "bailian/qwen-long-latest",
      "bailian/qwen-omni-turbo",
      "bailian/qwen-vl-max",
      "bailian/qwen-vl-plus",
      "bailian/qwen2.5-omni-7b",
      "bailian/qwen3-14b",
      "bailian/qwen3-235b-a22b",
      "bailian/qwen3-235b-a22b-instruct-2507",
      "bailian/qwen3-235b-a22b-thinking-2507",
      "bailian/qwen3-30b-a3b",
      "bailian/qwen3-30b-a3b-instruct-2507",
      "bailian/qwen3-30b-a3b-thinking-2507",
      "bailian/qwen3-32b",
      "bailian/qwen3-8b",
      "bailian/qwen3-coder-30b-a3b-instruct",
      "bailian/qwen3-coder-480b-a35b-instruct",
      "bailian/qwen3-coder-plus",
      "bailian/qwen3-coder-plus-2025-07-22",
      "bailian/qwen3-coder-plus-2025-09-23",
      "bailian/qwen3-next-80b-a3b-instruct",
      "bailian/qwen3-next-80b-a3b-thinking",
      "bailian/qwen3-omni-flash",
      "bailian/qwen3-omni-flash-2025-09-15",
      "bailian/qwen3-omni-flash-2025-12-01",
      "bailian/qwen3-vl-flash",
      "bailian/qwen3.6-max-preview",
      "bailian/qwq-plus",
    ],
  },
  {
    stopDate: "2026-09-25", sourceUrl: "https://fireworks.ai/models/deepseek-ai/deepseek-v4-flash-0731",
    keys: [
      "fireworks/accounts/fireworks/models/deepseek-v4-flash-0731",
    ],
  },
  {
    stopDate: "2026-09-25", sourceUrl: "https://fireworks.ai/models/deepseek-ai/deepseek-v4-flash-vision-exp",
    keys: [
      "fireworks/accounts/fireworks/models/deepseek-v4-flash-vision-exp",
    ],
  },
  {
    stopDate: "2026-09-25", sourceUrl: "https://fireworks.ai/models/deepseek-ai/deepseek-v4-pro-0813",
    keys: [
      "fireworks/accounts/fireworks/models/deepseek-v4-pro-0813",
    ],
  },
  {
    stopDate: "2026-09-25", sourceUrl: "https://fireworks.ai/models/fireworks/glm-5p2",
    keys: [
      "fireworks/accounts/fireworks/models/glm-5p2",
    ],
  },
  {
    stopDate: "2026-09-25", sourceUrl: "https://fireworks.ai/models/fireworks/kimi-k2p6",
    keys: [
      "fireworks/accounts/fireworks/models/kimi-k2p6",
    ],
  },
  {
    stopDate: "2026-09-25", sourceUrl: "https://fireworks.ai/models/fireworks/kimi-k2p7-code",
    keys: [
      "fireworks/accounts/fireworks/models/kimi-k2p7-code",
    ],
  },
  {
    stopDate: "2026-09-25", sourceUrl: "https://fireworks.ai/models/fireworks/muse-glimmer-30b",
    keys: [
      "fireworks/accounts/fireworks/models/muse-glimmer-30b",
    ],
  },
  {
    stopDate: "2026-10-10", sourceUrl: "https://platform.stepfun.com/docs/zh/guides/models/deprecations",
    keys: [
      "stepfun/step-2x-large",
    ],
  },
  {
    stopDate: "2026-10-10", sourceUrl: "https://platform.stepfun.com/docs/zh/announcements/image-model-retirement",
    keys: [
      "stepfun/step-image-edit-2",
    ],
  },
  {
    stopDate: "2026-10-21T10:00:00+08:00", sourceUrl: "https://mimo.mi.com/docs/zh-CN/updates/deprecate",
    keys: [
      "xiaomi/mimo-v2.5",
      "xiaomi/mimo-v2.5-pro",
    ],
  },
]
export const removedKeys = retirementGroups.flatMap(group => group.keys)
export function assertRemoved(provider: string, id: string) {
  const key = provider + '/' + id
  const expected = retirementGroups.find(group => group.keys.includes(key))
  assert.ok(expected, key + ': removal must be explicitly enumerated')
  assert.ok(removed[key], key + ': missing retirement evidence')
  assert.equal(removed[key].stopDate, expected.stopDate, key)
  assert.equal(removed[key].sourceUrl, expected.sourceUrl, key)
  assert.equal(catalog[provider].models.some((row: any) => row.id === id), false, key + ': absent from static catalog')
  assert.equal(config.providers[provider]?.some((row: any) => row.id === id) || false, false, key + ': absent from source catalog')
  assert.equal(AUDITED_CHANNEL_CONTRACTS[key], undefined, key + ': no executable contract')
  return removed[key] as { stopDate: string; sourceUrl: string }
}

export const addedKeys = [
  'openai/gpt-image-2.6-flare', 'openai/gpt-image-2.6-sunburst',
  'fireworks/accounts/fireworks/models/kimi-k3p1-pro', 'tokenhub/hy4',
  'longcat/LongCat-2.5', 'antling/Ling-3.1-flash', 'antling/Ling-3.2-flash',
]
export function assertCatalogDelta() {
  assert.deepEqual(Object.keys(removed).sort(), [...removedKeys].sort())
  for (const key of removedKeys) {
    const slash = key.indexOf('/')
    assertRemoved(key.slice(0, slash), key.slice(slash + 1))
  }
  for (const key of addedKeys) {
    const slash = key.indexOf('/'), provider = key.slice(0, slash), id = key.slice(slash + 1)
    const row = catalog[provider].models.find((model: any) => model.id === id)
    assert.ok(row, key)
    assert.deepEqual(row.roles, provider === 'openai' ? ['image'] : ['main'], key)
    assert.equal(row.verified, false, key)
    assert.equal(row.verificationState, 'catalog', key)
    if (provider === 'openai') {
      assert.equal(row.selectable, false, key)
      assert.match(row.disabledReason, /输出尺寸契约/, key)
    }
  }
  assert.equal(Object.values(catalog).reduce((n: number, p: any) => n + p.models.length, 0), 1125 - removedKeys.length + addedKeys.length)
}

export function assertSurvivingDefaults(provider: string, defaults: any) {
  const expected = { ...defaults }
  for (const [role, id] of Object.entries(defaults)) {
    if (!removedKeys.includes(provider + '/' + id)) continue
    assertRemoved(provider, String(id))
    assert.equal(provider, 'stepfun', 'only the retired StepFun image default may change')
    assert.equal(role, 'image')
    expected[role] = ''
  }
  assert.deepEqual(catalog[provider].defaults, expected)
}
