import { benchmarkJudgePrompt, JUDGE_MODELS } from './judge.js'
import { JUDGE_CALIBRATION_FIXTURES } from './calibration-fixtures.js'

export type OpenRouterJudgeProbeKind = 'text_only' | 'minimal_image' | 'benchmark_fixture'

export type OpenRouterJudgeProbeResult =
  | 'OPENROUTER_JUDGE_PROBE_OK'
  | 'OPENROUTER_JUDGE_PROBE_FORBIDDEN_EDGE'
  | 'OPENROUTER_JUDGE_PROBE_FORBIDDEN_UPSTREAM'
  | 'OPENROUTER_JUDGE_PROBE_FORBIDDEN_GUARDRAIL'
  | 'OPENROUTER_JUDGE_PROBE_FORBIDDEN_BUDGET'
  | 'OPENROUTER_JUDGE_PROBE_FORBIDDEN_ACCESS_POLICY'
  | 'OPENROUTER_JUDGE_PROBE_FORBIDDEN_OPAQUE'
  | 'OPENROUTER_JUDGE_PROBE_UNKNOWN_AFTER_DISPATCH'
  | `OPENROUTER_JUDGE_PROBE_HTTP_${number}`

const probeKinds = new Set<OpenRouterJudgeProbeKind>(['text_only', 'minimal_image', 'benchmark_fixture'])

function classifyForbidden(contentType: string, body: string): OpenRouterJudgeProbeResult {
  const lower = body.toLowerCase()
  if (/text\/html|application\/xhtml/.test(contentType) || /^\s*(?:<!doctype\s+html|<html\b)/i.test(body)) {
    return 'OPENROUTER_JUDGE_PROBE_FORBIDDEN_EDGE'
  }
  if (/guardrail|prompt.?injection|content.?filter/.test(lower)) {
    return 'OPENROUTER_JUDGE_PROBE_FORBIDDEN_GUARDRAIL'
  }
  if (/insufficient.{0,20}(?:credit|fund)|(?:credit|budget|spend).{0,30}(?:limit|exhaust|remain|reach|insufficient)/.test(lower)) {
    return 'OPENROUTER_JUDGE_PROBE_FORBIDDEN_BUDGET'
  }
  if (/allow.?list|allowed.{0,20}(?:model|provider)|permission|access.{0,20}(?:denied|policy)|zero.?data.?retention|\bzdr\b/.test(lower)) {
    return 'OPENROUTER_JUDGE_PROBE_FORBIDDEN_ACCESS_POLICY'
  }
  try {
    const value = JSON.parse(body) as any
    const metadata = value?.error?.metadata
    const raw = typeof metadata?.raw === 'string' ? metadata.raw.toLowerCase() : ''
    if (raw || metadata?.provider_name || metadata?.provider || value?.error?.provider) {
      return 'OPENROUTER_JUDGE_PROBE_FORBIDDEN_UPSTREAM'
    }
  } catch {
    // The fixed classification is intentionally independent of response text.
  }
  return 'OPENROUTER_JUDGE_PROBE_FORBIDDEN_OPAQUE'
}

export async function runOpenRouterJudgeProbe(input: {
  kind: OpenRouterJudgeProbeKind
  apiKey: string
  imageBase64?: string
  fetchImpl?: typeof fetch
  timeoutMs?: number
}): Promise<OpenRouterJudgeProbeResult> {
  if (!probeKinds.has(input.kind)) throw new Error('BENCHMARK_OPENROUTER_PROBE_KIND_INVALID')
  if (!input.apiKey) throw new Error('BENCHMARK_OPENROUTER_PROBE_CREDENTIAL_MISSING')
  if (input.kind !== 'text_only' && !input.imageBase64) throw new Error('BENCHMARK_OPENROUTER_PROBE_IMAGE_MISSING')

  const fixture = JUDGE_CALIBRATION_FIXTURES[0]
  const prompt = input.kind === 'benchmark_fixture'
    ? benchmarkJudgePrompt({ rubric: fixture.rubric, caption: fixture.caption })
    : 'Return exactly {"probe":"ok"} as a JSON object.'
  const content = input.kind === 'text_only'
    ? prompt
    : [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:image/png;base64,${input.imageBase64}` } },
      ]
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs || 90_000)
  try {
    const response = await (input.fetchImpl || fetch)('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        'Content-Type': 'application/json',
        'X-OpenRouter-Metadata': 'enabled',
      },
      body: JSON.stringify({
        model: JUDGE_MODELS.openrouter,
        messages: [{ role: 'user', content }],
        response_format: { type: 'json_object' },
        temperature: 0,
        max_tokens: input.kind === 'benchmark_fixture' ? 1200 : 32,
      }),
    })
    if (response.ok) return 'OPENROUTER_JUDGE_PROBE_OK'
    if (response.status !== 403) return `OPENROUTER_JUDGE_PROBE_HTTP_${response.status}`
    const body = (await response.text().catch(() => '')).slice(0, 65_536)
    return classifyForbidden(String(response.headers.get('content-type') || '').toLowerCase(), body)
  } catch {
    return 'OPENROUTER_JUDGE_PROBE_UNKNOWN_AFTER_DISPATCH'
  } finally {
    clearTimeout(timeout)
  }
}
