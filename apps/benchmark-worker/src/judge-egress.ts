import { ProxyAgent, fetch as undiciFetch } from 'undici'
import type { Dispatcher } from 'undici'

const FIXED_PROXY_URL = 'http://10.77.0.2:3128'

type Env = Record<string, string | undefined>
type FetchWithDispatcher = (input: string | URL, init?: RequestInit & { dispatcher?: Dispatcher }) => Promise<Response>

function validateTarget(input: RequestInfo | URL): string | URL {
  const raw = typeof input === 'string' || input instanceof URL ? input : input.url
  let url: URL
  try { url = new URL(String(raw)) } catch { throw new Error('BENCHMARK_OPENROUTER_EGRESS_TARGET_INVALID') }
  if (url.protocol !== 'https:' || url.hostname !== 'openrouter.ai' || url.port || url.username || url.password) {
    throw new Error('BENCHMARK_OPENROUTER_EGRESS_TARGET_INVALID')
  }
  return raw
}

export function createOpenRouterJudgeEgress(env: Env, dependencies: {
  createProxyAgent?(proxyUrl: string): Dispatcher
  fetchWithDispatcher?: FetchWithDispatcher
} = {}) {
  if (env.PAPERBANANA_BENCH_OPENROUTER_EGRESS_MODE !== 'sg-required'
    || env.PAPERBANANA_BENCH_SG_PROXY_URL !== FIXED_PROXY_URL) {
    throw new Error('BENCHMARK_OPENROUTER_EGRESS_CONFIG_INVALID')
  }
  const dispatcher = dependencies.createProxyAgent?.(FIXED_PROXY_URL) || new ProxyAgent(FIXED_PROXY_URL)
  const fetchWithDispatcher = dependencies.fetchWithDispatcher || undiciFetch as unknown as FetchWithDispatcher
  let closePromise: Promise<void> | undefined
  return {
    fetch: (async (input: RequestInfo | URL, init?: RequestInit) => fetchWithDispatcher(validateTarget(input), {
      ...init,
      dispatcher,
    })) as typeof fetch,
    close(): Promise<void> {
      closePromise ||= Promise.resolve(dispatcher.close()).then(() => {})
      return closePromise
    },
  }
}
