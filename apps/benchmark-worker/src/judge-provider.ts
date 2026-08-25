import { benchmarkJudgePrompt, JUDGE_MODELS, judgeWithSingleRepair } from './judge.js'
import { UnknownProviderOutcomeError } from './provider-operation.js'

async function parseText(response: Response) {
  if (!response.ok) throw Object.assign(new Error(`BENCHMARK_JUDGE_HTTP_${response.status}`), { status: response.status, retryAfterMs: Number(response.headers.get('retry-after') || 0) * 1_000 })
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
  return judgeWithSingleRepair(async (repair, malformed) => {
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
        headers: { Authorization: `Bearer ${input.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: JUDGE_MODELS[input.provider],
          messages: [{ role: 'user', content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:image/png;base64,${input.imageBase64}` } },
          ] }],
          response_format: { type: 'json_object' },
          temperature: 0,
        }),
      })
      return await parseText(response)
    } catch (error) {
      if (response && !controller.signal.aborted) throw error
      throw new UnknownProviderOutcomeError(`Judge request outcome unknown after dispatch: ${String((error as Error)?.name || 'network error')}`)
    } finally { clearTimeout(timeout) }
  })
}
