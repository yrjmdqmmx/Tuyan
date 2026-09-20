import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { Agent, fetch as undiciFetch } from 'undici'
import { UniversalApiError } from '../../../packages/api/src/universal-api.js'

export interface UniversalDnsAddress { address: string; family: number }
export interface UniversalTransportRequest {
  url: string; method: 'GET' | 'POST'; headers?: Record<string, string>; body?: string | Uint8Array
  maxRequestBytes?: number; maxResponseBytes: number; signal?: AbortSignal; kind: 'inference' | 'catalog' | 'asset'
}
export interface UniversalTransportResponse { status: number; headers: Headers; bytes: Uint8Array }
export interface UniversalTransport {
  checkUrl(url: string, asset?: boolean): Promise<void>
  request(input: UniversalTransportRequest): Promise<UniversalTransportResponse>
}
export interface UniversalTransportOptions {
  resolve?: (hostname: string) => Promise<UniversalDnsAddress[]>
  dnsTimeoutMs?: number
  /** Injection seam for mocked tests; production defaults to undici with a pinned DNS dispatcher. */
  fetch?: (url: string, init: any) => Promise<Response>
  /** Existing controlled proxy egress; only exact audited official hosts may use it. */
  officialFetch?: (url: string, init: RequestInit) => Promise<Response>
}
const universalOfficialHosts = new Set(['api.openai.com', 'api.anthropic.com', 'api.x.ai', 'generativelanguage.googleapis.com', 'openrouter.ai', 'tokendance.space', 'ark.cn-beijing.volces.com', 'api.mistral.ai', 'api.together.ai', 'api.fireworks.ai', 'api.minimax.io'])

export function universalPublicIp(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b, c] = address.split('.').map(Number)
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 || a === 192 && (b === 168 || b === 0 && (c === 0 || c === 2) || b === 88 && c === 99) || a === 100 && b >= 64 && b <= 127 || a === 198 && (b === 18 || b === 19 || b === 51 && c === 100) || a === 203 && b === 0 && c === 113)
  }
  if (isIP(address) !== 6 || address.includes('%')) return false
  // Restrict to global unicast; exclude transition, documentation, benchmark and special-purpose space.
  const head = Number.parseInt(address.split(':')[0], 16)
  if (!Number.isFinite(head) || head < 0x2000 || head > 0x3fff || head === 0x2002 || head === 0x3fff) return false
  if (head === 0x2001) {
    const second = Number.parseInt(address.split(':')[1] || '0', 16)
    if (second < 0x200 || second === 0xdb8) return false
  }
  return true
}
function universalTransportUrl(value: string, asset: boolean, catalog = false): URL {
  let url: URL
  try { url = new URL(value) } catch { throw new UniversalApiError('ENDPOINT_UNSAFE') }
  if (url.protocol !== 'https:' || url.port && url.port !== '443' || url.username || url.password || url.hash || !asset && !catalog && url.search || /[\x00-\x20\\]/.test(value)) throw new UniversalApiError('ENDPOINT_UNSAFE')
  if (catalog && url.search) {
    const entries = [...url.searchParams.entries()], keys = entries.map(([key]) => key)
    const anthropic = keys.every(key => ['limit', 'after_id'].includes(key)), gemini = keys.every(key => ['pageSize', 'pageToken'].includes(key))
    if (!url.pathname.endsWith('/models') || new Set(keys).size !== keys.length || !anthropic && !gemini
      || entries.some(([key, value]) => ['limit', 'pageSize'].includes(key) ? !/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 1000 : !value || value.length > 2048 || value.trim() !== value || /[\x00-\x1f\x7f]/.test(value))) throw new UniversalApiError('ENDPOINT_UNSAFE')
  }
  const host = url.hostname.toLowerCase()
  if (!host || host.endsWith('.') || host === 'localhost' || /\.(?:localhost|local|internal|test|invalid)$/.test(host)) throw new UniversalApiError('ENDPOINT_UNSAFE')
  return url
}
async function universalBoundedBody(response: Response, maxBytes: number, state: 'not_sent' | 'unknown'): Promise<Uint8Array> {
  const declared = response.headers.get('content-length')
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > maxBytes)) {
    await response.body?.cancel(); throw new UniversalApiError('RESPONSE_LIMIT', state)
  }
  const reader = response.body?.getReader()
  if (!reader) return new Uint8Array()
  const parts: Uint8Array[] = []; let size = 0
  try {
    while (true) {
      const part = await reader.read()
      if (part.done) break
      size += part.value.byteLength
      if (size > maxBytes) { await reader.cancel(); throw new UniversalApiError('RESPONSE_LIMIT', state) }
      parts.push(part.value)
    }
  } finally { reader.releaseLock() }
  const bytes = new Uint8Array(size); let at = 0
  for (const part of parts) { bytes.set(part, at); at += part.byteLength }
  return bytes
}
export function createUniversalTransport(options: UniversalTransportOptions = {}): UniversalTransport {
  const resolve = options.resolve || (async (host: string) => await lookup(host, { all: true, verbatim: true }))
  async function checked(value: string, asset: boolean, catalog = false) {
    const url = universalTransportUrl(value, asset, catalog), host = url.hostname.replace(/^\[|\]$/g, '')
    let addresses: UniversalDnsAddress[]
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      addresses = isIP(host) ? [{ address: host, family: isIP(host) }] : await Promise.race([resolve(host), new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new UniversalApiError('REQUEST_TIMEOUT')), Math.min(10000, Math.max(1, options.dnsTimeoutMs || 5000))) })])
    } catch (error) {
      if (error instanceof UniversalApiError) throw error
      throw new UniversalApiError('DNS_RESOLUTION_FAILED')
    } finally { if (timer) clearTimeout(timer) }
    if (!Array.isArray(addresses) || !addresses.length || addresses.length > 128 || addresses.some(row => !row || typeof row.address !== 'string' || !universalPublicIp(row.address) || isIP(row.address) !== row.family)) throw new UniversalApiError('ENDPOINT_UNSAFE')
    return { url, addresses }
  }
  return {
    async checkUrl(url, asset = false) { await checked(url, asset) },
    async request(input) {
      if (input.kind === 'catalog' && (input.method !== 'GET' || input.body !== undefined)) throw new UniversalApiError('ENDPOINT_UNSAFE')
      const { url, addresses } = await checked(input.url, input.kind === 'asset', input.kind === 'catalog')
      if (!Number.isSafeInteger(input.maxResponseBytes) || input.maxResponseBytes < 1 || input.maxResponseBytes > 128 * 1024 * 1024) throw new UniversalApiError('CONFIG_INVALID')
      const bodyBytes = typeof input.body === 'string' ? Buffer.byteLength(input.body) : input.body?.byteLength || 0
      if (bodyBytes > (input.maxRequestBytes ?? 120 * 1024 * 1024)) throw new UniversalApiError('INPUT_LIMIT')
      if (input.signal?.aborted) throw new UniversalApiError(input.kind === 'catalog' ? 'REQUEST_TIMEOUT' : 'CONFIG_INVALID')
      const state = input.kind === 'catalog' ? 'not_sent' : 'unknown'
      const headers = input.kind === 'asset' ? {} : { ...input.headers }
      const address = addresses[0]
      const dispatcher = new Agent({ connect: {
        lookup: (_hostname, lookupOptions, callback) => {
          if (lookupOptions.all) callback(null, [{ address: address.address, family: address.family }])
          else callback(null, address.address, address.family)
        },
        // Keep the URL hostname for both certificate verification and SNI; only DNS is pinned.
        rejectUnauthorized: true,
      } })
      const init: any = { method: input.method, headers, ...(input.body === undefined ? {} : { body: input.body }), redirect: 'manual', signal: AbortSignal.any([AbortSignal.timeout(input.kind === 'inference' ? 180000 : 30000), ...(input.signal ? [input.signal] : [])]) }
      const official = input.kind !== 'asset' && universalOfficialHosts.has(url.hostname) && options.officialFetch
      try {
        const response = official ? await options.officialFetch!(url.href, init) : await (options.fetch || undiciFetch as any)(url.href, { ...init, dispatcher })
        if (response.status >= 300 && response.status < 400) { await response.body?.cancel(); throw new UniversalApiError('ENDPOINT_UNSAFE', state, response.status) }
        if (!response.ok) {
          let code: import('../../../packages/api/src/universal-api.js').UniversalErrorCode = response.status >= 500 ? 'UPSTREAM_FAILURE' : 'UPSTREAM_REJECTED'
          let publicStatus = response.status
          if (response.status >= 400 && response.status < 500) {
            if (response.status === 404) code = 'ENDPOINT_NOT_FOUND'
            try {
              const data = JSON.parse(Buffer.from(await universalBoundedBody(response, 8192, state)).toString('utf8'))
              const upstreamCode = data?.error?.code || data?.code || data?.error?.type
              if (response.status === 404 && ['model_not_found', 'model_not_exist', 'invalid_model', 'MODEL_NOT_FOUND', 'ModelNotFound', 'InvalidParameter.ModelNotFound'].includes(upstreamCode)) code = 'MODEL_NOT_FOUND'
              // Known billing codes can use HTTP 400/403/429. Never classify by raw messages.
              if (['insufficient_quota', 'insufficient_balance', 'InsufficientBalance', 'Arrearage', 'AccountOverdue'].includes(upstreamCode)) publicStatus = 402
            } catch { /* Only the allowlisted structured code is used; discard all upstream text. */ }
          } else await response.body?.cancel()
          throw new UniversalApiError(code, input.kind === 'catalog' ? 'not_sent' : response.status >= 400 && response.status < 500 ? 'rejected' : 'unknown', publicStatus)
        }
        return { status: response.status, headers: response.headers, bytes: await universalBoundedBody(response, input.maxResponseBytes, state) }
      } catch (error) {
        if (error instanceof UniversalApiError) throw error
        let current: any = error, timedOut = false
        for (let depth = 0; current && depth < 4; depth++, current = current.cause) if (current.name === 'TimeoutError' || input.kind === 'catalog' && input.signal?.reason?.name === 'TimeoutError' || ['UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_BODY_TIMEOUT', 'ETIMEDOUT'].includes(current.code)) timedOut = true
        throw new UniversalApiError(timedOut ? 'REQUEST_TIMEOUT' : input.signal?.aborted ? 'RESULT_UNKNOWN' : 'NETWORK_ERROR', state)
      } finally { await dispatcher.close() }
    },
  }
}
