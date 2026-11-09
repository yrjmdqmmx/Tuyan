import {
  Dispatcher,
  ProxyAgent,
  Request as UndiciRequest,
  fetch as undiciFetch,
  getGlobalDispatcher,
} from 'undici'
import type { BodyInit as UndiciBodyInit } from 'undici'

import type { ServiceConfig } from './config.js'
import { DIRECT_ELIGIBLE_HOSTS, HONG_KONG_ELIGIBLE_HOSTS } from './provider-route-policy.js'

export const PROVIDER_EGRESS_UNAVAILABLE_MESSAGE = '海外模型出口暂不可用，请稍后重试。'

type ProviderEgressConfig = ServiceConfig['providerEgress']
type CompatibleRequest = string | URL | globalThis.Request | UndiciRequest

const targetHosts = new Set([
  'bedrock-runtime.us-east-1.amazonaws.com', 'bedrock-runtime.us-east-2.amazonaws.com', 'bedrock-runtime.us-west-2.amazonaws.com',
  'api.openai.com',
  'api.anthropic.com',
  'api.x.ai',
  'external.api.recraft.ai',
  'api.bfl.ai', 'api.eu.bfl.ai', 'api.us.bfl.ai',
  'api.stability.ai', 'api.ideogram.ai', 'api.minimax.io', 'api.mistral.ai',
  'api.together.ai', 'api.fireworks.ai', 'queue.fal.run', 'api.fal.ai', 'runware.ai', 'api.replicate.com', 'api.runware.ai', 'api.novita.ai',
  'generativelanguage.googleapis.com',
  'openrouter.ai',
  'tokendance.space',
  'ark.cn-beijing.volces.com',
])

function unavailableError(): Error & { code: string } {
  const error = new Error(PROVIDER_EGRESS_UNAVAILABLE_MESSAGE) as Error & { code: string }
  error.name = 'ProviderEgressUnavailableError'
  error.code = 'PROVIDER_EGRESS_UNAVAILABLE'
  return error
}

function causedByProviderEgress(error: unknown): boolean {
  let current = error
  const seen = new Set<unknown>()
  while (current && typeof current === 'object' && !seen.has(current)) {
    seen.add(current)
    if ((current as { code?: string }).code === 'PROVIDER_EGRESS_UNAVAILABLE') return true
    current = (current as { cause?: unknown }).cause
  }
  return false
}

function normalizedTargetOrigin(origin: string | URL | undefined, directHosts: readonly string[] = []): boolean {
  if (!origin) return false
  let url: URL
  try {
    url = new URL(String(origin))
  } catch {
    return false
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
  if (url.username || url.password) return false

  let hostname = url.hostname.toLowerCase()
  if (hostname.endsWith('.')) hostname = hostname.slice(0, -1)
  // Strip exactly one DNS root label. Multiple trailing dots and IDNA
  // lookalikes remain non-targets instead of being widened into the allowlist.
  if (!hostname || hostname.endsWith('.')) return false
  // Only these measured API origins may opt out of the overseas proxy.
  // Keep other schemes, ports and all other origins on their existing policy.
  if (url.protocol === 'https:' && (!url.port || url.port === '443')
    && DIRECT_ELIGIBLE_HOSTS.includes(hostname)
    && directHosts.includes(hostname)) return false
  // Azure resource names vary. Classify them for REQUIRED proxy routing only;
  // the proxy still requires an operator-added exact resource hostname ACL. No wildcard egress grant.
  return targetHosts.has(hostname) || /^[a-z0-9][a-z0-9-]{1,62}\.(?:openai\.azure\.com|services\.ai\.azure\.com)$/.test(hostname) || /^api\.[a-z0-9.-]+\.bfl\.ai$/.test(hostname)
}

function usesHongKong(origin: string | URL | undefined, hosts: readonly string[]): boolean {
  if (!origin) return false
  try {
    const url = new URL(String(origin))
    const hostname = url.hostname.toLowerCase().replace(/\.$/, '')
    return url.protocol === 'https:' && (!url.port || url.port === '443')
      && !url.username && !url.password
      && HONG_KONG_ELIGIBLE_HOSTS.includes(hostname) && hosts.includes(hostname)
  } catch {
    return false
  }
}

function requestHeaders(request: { headers?: { forEach?(callback: (value: string, key: string) => void): void } }) {
  const headers: Array<[string, string]> = []
  request.headers?.forEach?.((value, key) => headers.push([key, value]))
  return headers
}

function credentialFreeUrl(value: string): string {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return value
  }
  if (url.username || url.password) throw new TypeError('Request URL must not include credentials')
  return value
}

async function normalizeRequestInput(input: CompatibleRequest): Promise<Parameters<typeof undiciFetch>[0]> {
  if (typeof input === 'string') return credentialFreeUrl(input)
  const request = input as unknown as {
    href?: unknown
    url?: unknown
    method?: unknown
    headers?: { forEach?(callback: (value: string, key: string) => void): void }
    body?: unknown
    redirect?: unknown
    signal?: unknown
    clone?(): { arrayBuffer(): Promise<ArrayBuffer> }
  }
  if (typeof request.url !== 'string' || typeof request.method !== 'string') {
    return credentialFreeUrl(typeof request.href === 'string' ? request.href : String(input))
  }

  const method = request.method.toUpperCase()
  let body: UndiciBodyInit | undefined
  if (method !== 'GET' && method !== 'HEAD' && request.body !== null && request.body !== undefined) {
    body = new Uint8Array(await request.clone?.().arrayBuffer() || new ArrayBuffer(0))
  }
  return new UndiciRequest(credentialFreeUrl(request.url), {
    method,
    headers: requestHeaders(request),
    body,
    duplex: body ? 'half' : undefined,
    redirect: request.redirect as 'error' | 'follow' | 'manual' | undefined,
    signal: request.signal as AbortSignal | undefined,
  })
}

function targetHandler(
  handler: Dispatcher.DispatchHandler,
  success: () => void,
  failure: () => void,
): Dispatcher.DispatchHandler {
  return {
    onConnect(abort) { handler.onConnect?.call(handler, abort) },
    onResponseStarted() { handler.onResponseStarted?.call(handler) },
    onHeaders(statusCode, headers, resume, statusText) {
      if (statusCode >= 200) success()
      return handler.onHeaders?.call(handler, statusCode, headers, resume, statusText) ?? false
    },
    onData(chunk) { return handler.onData?.call(handler, chunk) ?? true },
    onComplete(trailers) { handler.onComplete?.call(handler, trailers) },
    onBodySent(chunkSize, totalBytesSent) {
      handler.onBodySent?.call(handler, chunkSize, totalBytesSent)
    },
    onUpgrade(statusCode, headers, socket) {
      success()
      handler.onUpgrade?.call(handler, statusCode, headers, socket)
    },
    onError() {
      failure()
      handler.onError?.call(handler, unavailableError())
    },
  }
}

class OriginAwareDispatcher extends Dispatcher {
  constructor(
    private readonly direct: Dispatcher,
    private readonly proxy: Dispatcher | undefined,
    private readonly onTargetSuccess: () => void,
    private readonly onTargetFailure: () => void,
    private readonly directHosts: readonly string[] = [],
    private readonly hongkong?: { dispatcher: Dispatcher; hosts: readonly string[] },
  ) {
    super()
  }

  dispatch(options: Dispatcher.DispatchOptions, handler: Dispatcher.DispatchHandler): boolean {
    if (!normalizedTargetOrigin(options.origin, this.directHosts)) {
      return this.direct.dispatch(options, handler)
    }
    const selectedProxy = this.hongkong && usesHongKong(options.origin, this.hongkong.hosts)
      ? this.hongkong.dispatcher : this.proxy
    if (!selectedProxy) {
      this.onTargetFailure()
      throw unavailableError()
    }
    try {
      return selectedProxy.dispatch(
        options,
        targetHandler(handler, this.onTargetSuccess, this.onTargetFailure),
      )
    } catch {
      this.onTargetFailure()
      throw unavailableError()
    }
  }
}

export function createProviderEgress(
  config: ProviderEgressConfig,
  dependencies: {
    directDispatcher?: Dispatcher
    createProxyAgent?(proxyUrl: string): Dispatcher
  } = {},
) {
  const directDispatcher = dependencies.directDispatcher || getGlobalDispatcher()
  const proxyDispatcher = config.mode === 'sg-required'
    ? (dependencies.createProxyAgent?.(config.proxyUrl) || new ProxyAgent(config.proxyUrl))
    : undefined
  const hongkongDispatcher = config.mode === 'sg-required' && config.hongkong
    ? (dependencies.createProxyAgent?.(config.hongkong.proxyUrl) || new ProxyAgent(config.hongkong.proxyUrl))
    : undefined
  let state: 'ready' | 'degraded' = 'degraded'
  let closePromise: Promise<void> | undefined
  const dispatcher = new OriginAwareDispatcher(
    directDispatcher,
    proxyDispatcher,
    () => { state = 'ready' },
    () => { state = 'degraded' },
    config.directHosts,
    hongkongDispatcher && config.hongkong ? { dispatcher: hongkongDispatcher, hosts: config.hongkong.hosts } : undefined,
  )

  return {
    async fetch(input: CompatibleRequest, init?: RequestInit): Promise<Response> {
      try {
        return await undiciFetch(
          await normalizeRequestInput(input),
          { ...init, dispatcher } as Parameters<typeof undiciFetch>[1],
        ) as unknown as Response
      } catch (error) {
        if (causedByProviderEgress(error)) throw unavailableError()
        throw error
      }
    },
    snapshot(): 'ready' | 'degraded' {
      return state
    },
    close(): Promise<void> {
      closePromise ||= Promise.all([proxyDispatcher?.close(), hongkongDispatcher?.close()]).then(() => {})
      return closePromise
    },
  }
}
