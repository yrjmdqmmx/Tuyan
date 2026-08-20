import {
  Dispatcher,
  ProxyAgent,
  Request as UndiciRequest,
  fetch as undiciFetch,
  getGlobalDispatcher,
} from 'undici'
import type { BodyInit as UndiciBodyInit } from 'undici'

import type { ServiceConfig } from './config.js'

export const PROVIDER_EGRESS_UNAVAILABLE_MESSAGE = '海外模型出口暂不可用，请稍后重试。'

type ProviderEgressConfig = ServiceConfig['providerEgress']
type CompatibleRequest = string | URL | globalThis.Request | UndiciRequest

const targetHosts = new Set([
  'api.openai.com',
  'generativelanguage.googleapis.com',
  'openrouter.ai',
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

function normalizedTargetOrigin(origin: string | URL | undefined): boolean {
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
  return targetHosts.has(hostname)
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
  ) {
    super()
  }

  dispatch(options: Dispatcher.DispatchOptions, handler: Dispatcher.DispatchHandler): boolean {
    if (!normalizedTargetOrigin(options.origin)) {
      return this.direct.dispatch(options, handler)
    }
    if (!this.proxy) {
      this.onTargetFailure()
      throw unavailableError()
    }
    try {
      return this.proxy.dispatch(
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
  let state: 'ready' | 'degraded' = 'degraded'
  let closePromise: Promise<void> | undefined
  const dispatcher = new OriginAwareDispatcher(
    directDispatcher,
    proxyDispatcher,
    () => { state = 'ready' },
    () => { state = 'degraded' },
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
      closePromise ||= Promise.resolve(proxyDispatcher?.close()).then(() => {})
      return closePromise
    },
  }
}
