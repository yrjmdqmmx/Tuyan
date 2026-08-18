import { ProxyAgent, fetch as undiciFetch } from 'undici'

import type { ServiceConfig } from './config.js'

export const PROVIDER_EGRESS_UNAVAILABLE_MESSAGE = '海外模型出口暂不可用，请稍后重试。'

type ProviderEgressConfig = ServiceConfig['providerEgress']
type DispatchingRequestInit = RequestInit & { dispatcher?: unknown }
type RuntimeFetch = (input: string | URL | Request, init?: DispatchingRequestInit) => Promise<Response>
type ClosableDispatcher = { close(): void | Promise<void> }

const targetHosts = new Set([
  'api.openai.com',
  'generativelanguage.googleapis.com',
  'openrouter.ai',
])

function targetUrl(input: string | URL | Request): boolean {
  let url: URL
  try {
    url = new URL(input instanceof Request ? input.url : String(input))
  } catch {
    return false
  }
  return (url.protocol === 'http:' || url.protocol === 'https:') && targetHosts.has(url.hostname)
}

function unavailableError(): Error & { code: string } {
  const error = new Error(PROVIDER_EGRESS_UNAVAILABLE_MESSAGE) as Error & { code: string }
  error.name = 'ProviderEgressUnavailableError'
  error.code = 'PROVIDER_EGRESS_UNAVAILABLE'
  return error
}

export function createProviderEgress(
  config: ProviderEgressConfig,
  dependencies: {
    fetch?: RuntimeFetch
    createProxyAgent?(proxyUrl: string): ClosableDispatcher
  } = {},
) {
  const transport: RuntimeFetch = dependencies.fetch
    || ((input, init) => undiciFetch(
      input as Parameters<typeof undiciFetch>[0],
      init as Parameters<typeof undiciFetch>[1],
    ) as unknown as Promise<Response>)
  const dispatcher = config.mode === 'sg-required'
    ? (dependencies.createProxyAgent?.(config.proxyUrl) || new ProxyAgent(config.proxyUrl))
    : undefined
  let state: 'ready' | 'degraded' = config.mode === 'sg-required' ? 'ready' : 'degraded'
  let closePromise: Promise<void> | undefined

  return {
    async fetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
      if (!targetUrl(input)) return transport(input, init)
      if (!dispatcher) throw unavailableError()
      try {
        const response = await transport(input, { ...init, dispatcher })
        state = 'ready'
        return response
      } catch {
        state = 'degraded'
        throw unavailableError()
      }
    },
    snapshot(): 'ready' | 'degraded' {
      return state
    },
    close(): Promise<void> {
      closePromise ||= Promise.resolve(dispatcher?.close()).then(() => {})
      return closePromise
    },
  }
}
