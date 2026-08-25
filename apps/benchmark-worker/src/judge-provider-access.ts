const OPENROUTER_MODEL = 'google/gemini-3.7-flash'
const BAILIAN_MODEL = 'qwen3.7-plus'

type DiagnosticInput = {
  openrouterKey: string
  bailianKey: string
  fetchImpl?: typeof fetch
  emit(stage: string): void
}

async function getJson(fetchImpl: typeof fetch, provider: 'OPENROUTER' | 'BAILIAN', url: string, apiKey: string) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20_000)
  let response: Response
  try {
    response = await fetchImpl(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
    })
  } catch {
    throw new Error(`BENCHMARK_JUDGE_ACCESS_${provider}_NETWORK`)
  } finally {
    clearTimeout(timeout)
  }
  if ([401, 403].includes(response.status)) throw new Error(`BENCHMARK_JUDGE_ACCESS_${provider}_AUTH`)
  if (!response.ok) throw new Error(`BENCHMARK_JUDGE_ACCESS_${provider}_HTTP_${response.status}`)
  try { return await response.json() as any } catch { throw new Error(`BENCHMARK_JUDGE_ACCESS_${provider}_JSON`) }
}

export async function diagnoseJudgeProviderAccess(input: DiagnosticInput) {
  const fetchImpl = input.fetchImpl || fetch
  if (!input.openrouterKey || !input.bailianKey) throw new Error('BENCHMARK_JUDGE_ACCESS_CREDENTIALS_MISSING')

  const key = await getJson(fetchImpl, 'OPENROUTER', 'https://openrouter.ai/api/v1/key', input.openrouterKey)
  if (key?.data?.is_management_key === true) throw new Error('BENCHMARK_JUDGE_ACCESS_OPENROUTER_KEY_KIND')
  const remaining = key?.data?.limit_remaining
  if (typeof remaining === 'number' && remaining <= 0) throw new Error('BENCHMARK_JUDGE_ACCESS_OPENROUTER_BUDGET')
  input.emit('openrouter-auth-ok')

  const openrouter = await getJson(fetchImpl, 'OPENROUTER', 'https://openrouter.ai/api/v1/models', input.openrouterKey)
  if (!Array.isArray(openrouter?.data) || !openrouter.data.some((model: any) => model?.id === OPENROUTER_MODEL)) {
    throw new Error('BENCHMARK_JUDGE_ACCESS_OPENROUTER_MODEL')
  }
  input.emit('openrouter-model-ok')

  const bailian = await getJson(fetchImpl, 'BAILIAN', 'https://dashscope.aliyuncs.com/compatible-mode/v1/models', input.bailianKey)
  input.emit('bailian-auth-ok')
  if (!Array.isArray(bailian?.data) || !bailian.data.some((model: any) => model?.id === BAILIAN_MODEL)) {
    throw new Error('BENCHMARK_JUDGE_ACCESS_BAILIAN_MODEL')
  }
  input.emit('bailian-model-ok')
  input.emit('diagnostic-complete')
  return { openrouterModel: OPENROUTER_MODEL, bailianModel: BAILIAN_MODEL }
}
