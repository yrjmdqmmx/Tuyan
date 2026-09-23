import assert from 'node:assert/strict'
import test from 'node:test'
import { createRequire } from 'node:module'
import { orderModelChannels } from '../apps/web/src/lib/modelPresentation.js'
const require = createRequire(import.meta.url)
const mini = require('../apps/miniprogram/miniprogram/utils/model-presentation.js')
const { MODEL_PROVIDER_IDS } = require('../apps/miniprogram/miniprogram/utils/model-registry.js')

test('every channel is stably grouped by API operator across Web and Mini without changing input', () => {
  const original = [...MODEL_PROVIDER_IDS]
  const expected = ['tokendance','siliconflow','tokenhub','bailian','ark','deepseek','kimi','zhipu','minimax','xiaomi','sensenova','stepfun','qianfan','iflytek','longcat','gemini','openai','anthropic','recraft','xai','bfl','stability','ideogram','mistral','openrouter','together','fireworks','fal','replicate','runware']
  assert.deepEqual(orderModelChannels(original), expected)
  assert.deepEqual(mini.orderModelChannels(original), expected)
  assert.deepEqual(original, MODEL_PROVIDER_IDS)
  assert.deepEqual(orderModelChannels(['replicate','openai','bailian','siliconflow','mistral','ark','future','another']), ['siliconflow','bailian','ark','openai','mistral','replicate','future','another'])
  assert.deepEqual(orderModelChannels(['ark','bailian','together','openrouter']), ['ark','bailian','together','openrouter'])
})
