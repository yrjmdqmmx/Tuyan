import { benchmarkJudgePrompt, JUDGE_MODELS, judgeWithSingleRepair } from './judge.js'
import { UnknownProviderOutcomeError } from './provider-operation.js'

const scoreProperties = Object.fromEntries([
  'faithfulness', 'conciseness', 'readability', 'aesthetics', 'text_accuracy', 'topology', 'instruction_adherence',
].map((axis) => [axis, { type: 'number', minimum: 0, maximum: 10 }]))

const openRouterResponseFormat = Object.freeze({
  type: 'json_schema',
  json_schema: {
    name: 'paperbanana_benchmark_judgment',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        scores: {
          type: 'object', properties: scoreProperties, required: Object.keys(scoreProperties), additionalProperties: false,
        },
        evidence: { type: 'array', items: { type: 'string' } },
        redLines: {
          type: 'array',
          items: { type: 'string', enum: ['missing_node', 'reversed_arrow', 'garbled_text', 'occlusion', 'low_contrast', 'aspect_ratio_violation'] },
        },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
      },
      required: ['scores', 'evidence', 'redLines', 'confidence'],
      additionalProperties: false,
    },
  },
})

async function parseText(response: Response) {
  if (!response.ok) {
    let classification = `BENCHMARK_JUDGE_HTTP_${response.status}`
    if (response.status === 403) {
      const body = (await response.text().catch(() => '')).slice(0, 65_536).toLowerCase()
      classification = /guardrail|prompt.?injection|content.?filter/.test(body)
        ? 'BENCHMARK_JUDGE_FORBIDDEN_GUARDRAIL'
        : /insufficient.{0,20}(?:credit|fund)|(?:credit|budget|spend).{0,30}(?:limit|exhaust|remain|reach|insufficient)/.test(body)
          ? 'BENCHMARK_JUDGE_FORBIDDEN_BUDGET'
          : /allow.?list|allowed.{0,20}(?:model|provider)|permission|access.{0,20}(?:denied|policy)|zero.?data.?retention|\bzdr\b/.test(body)
            ? 'BENCHMARK_JUDGE_FORBIDDEN_ACCESS_POLICY'
            : classification
    }
    throw Object.assign(new Error(classification), { status: response.status, retryAfterMs: Number(response.headers.get('retry-after') || 0) * 1_000 })
  }
  const data = await response.json() as any
  return String(data.choices?.[0]?.message?.content || '')
}

export async function callBlindJudge(input: {
  provider: 'openrouter' | 'bailian'
  apiKey: string
  imageBase64: string
  rubric: unknown
  caption: string
  fetchImpl?: typeof fetch
  beforeDispatch?: (repair: boolean) => Promise<void>
  timeoutMs?: number
}) {
  const fetchImpl = input.fetchImpl || fetch
  const endpoint = input.provider === 'openrouter'
    ? 'https://openrouter.ai/api/v1/chat/completions'
    : 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
  try {
    return await judgeWithSingleRepair(async (repair, malformed) => {
    await input.beforeDispatch?.(repair)
    const prompt = repair
      ? `Repair this malformed answer into the required strict JSON schema. Return JSON only.\n${String(malformed || '').slice(0, 16_000)}`
      : benchmarkJudgePrompt({ rubric: input.rubric, caption: input.caption })
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), input.timeoutMs || 90_000)
    let response: Response | undefined
    try {
      response = await fetchImpl(endpoint, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
          'Content-Type': 'application/json',
          ...(input.provider === 'openrouter' ? { 'X-OpenRouter-Metadata': 'enabled' } : {}),
        },
        body: JSON.stringify({
          model: JUDGE_MODELS[input.provider],
          messages: [{ role: 'user', content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:image/png;base64,${input.imageBase64}` } },
          ] }],
          response_format: input.provider === 'openrouter' ? openRouterResponseFormat : { type: 'json_object' },
          ...(input.provider === 'openrouter' ? { provider: { require_parameters: true } } : {}),
          temperature: 0,
          max_tokens: 4096,
          ...(input.provider === 'openrouter' ? { reasoning: { effort: 'low', exclude: true } } : {}),
        }),
      })
      return await parseText(response)
    } catch (error) {
      if (response && !controller.signal.aborted) throw error
      throw new UnknownProviderOutcomeError(`Judge request outcome unknown after dispatch: ${String((error as Error)?.name || 'network error')}`)
    } finally { clearTimeout(timeout) }
    })
  } catch (error) {
    if ((error as Error)?.message === 'BENCHMARK_JUDGE_JSON_INVALID') {
      throw new Error(`BENCHMARK_JUDGE_JSON_INVALID_${input.provider.toUpperCase()}`)
    }
    throw error
  }
}
