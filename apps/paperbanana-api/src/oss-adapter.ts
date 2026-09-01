import OSS from 'ali-oss'

type OssConfig = {
  region: string
  accessKeyId: string
  accessKeySecret: string
  bucket: string
  internalEndpoint: string
  publicEndpoint: string
  serverEndpointMode?: 'internal' | 'public'
  secure: true
  pathStyle: false
}

type OssClient = {
  signatureUrlV4(
    method: 'GET' | 'PUT',
    expires: number,
    request: { headers?: Record<string, string>; queries?: Record<string, string> } | undefined,
    key: string,
    additionalHeaders?: string[],
  ): Promise<string>
  put(key: string, content: unknown, options?: Record<string, unknown>): Promise<unknown>
  head?(key: string): Promise<{
    status?: number
    res?: { status?: number; headers?: Record<string, string | string[] | undefined> }
  }>
  getObjectMeta?(key: string): Promise<{
    status?: number
    res?: { status?: number; headers?: Record<string, string | string[] | undefined> }
  }>
  getACL?(key: string): Promise<{ acl?: string }>
  getStream?(key: string, options?: Record<string, unknown>): Promise<{
    stream: AsyncIterable<unknown> & { destroy?(error?: Error): void }
    res?: { status?: number; headers?: Record<string, string | string[] | undefined> }
  }>
  getBucketACL(name: string): Promise<{ acl: string }>
  delete(key: string): Promise<unknown>
  list(query: Record<string, unknown>): Promise<any>
}

const EXACT_RANGE_CHUNK_BYTES = 4 * 1024 * 1024
const EXACT_RANGE_ATTEMPTS = 3

export function createOssClients(config: OssConfig) {
  const common = {
    region: config.region,
    accessKeyId: config.accessKeyId,
    accessKeySecret: config.accessKeySecret,
    bucket: config.bucket,
    secure: true,
    authorizationV4: true,
    cname: false,
    sldEnable: false,
  }
  return {
    serverClient: new OSS({
      ...common,
      endpoint: config.serverEndpointMode === 'public' ? config.publicEndpoint : config.internalEndpoint,
    }),
    publicSigner: new OSS({ ...common, endpoint: config.publicEndpoint }),
  }
}

function normalizeHeaders(metadata: Record<string, unknown> = {}): Record<string, unknown> {
  const headers: Record<string, unknown> = {}
  for (const [name, value] of Object.entries(metadata)) {
    const normalizedName = name === 'ContentType'
      ? 'Content-Type'
      : name === 'CacheControl'
        ? 'Cache-Control'
        : name === 'ContentDisposition'
          ? 'Content-Disposition'
          : name
    headers[normalizedName] = value
  }
  return headers
}

function normalizeObject(object: Record<string, any>) {
  return {
    ...object,
    Key: object.name,
    Size: object.size,
    ETag: object.etag,
    LastModified: object.lastModified,
  }
}

function firstHeader(
  headers: Record<string, string | string[] | undefined> | undefined,
  name: string,
): string | undefined {
  const value = headers?.[name]
  return Array.isArray(value) ? value[0] : value
}

export function createOssAdapter(
  config: OssConfig,
  dependencies: { serverClient?: OssClient; publicSigner?: OssClient } = {},
) {
  const defaults = dependencies.serverClient && dependencies.publicSigner ? undefined : createOssClients(config)
  const serverClient = (dependencies.serverClient || defaults?.serverClient) as unknown as OssClient
  const publicSigner = (dependencies.publicSigner || defaults?.publicSigner) as unknown as OssClient

  function bucket(name: string) {
    if (name !== config.bucket) throw new Error(`Unexpected OSS bucket: ${name}`)
    return {
      async getUploadUrl(
        key: string,
        expires: number,
        metadata: { ContentType: string; ContentLength: number },
      ): Promise<string> {
        return publicSigner.signatureUrlV4(
          'PUT',
          expires,
          {
            headers: {
              'Content-Type': metadata.ContentType,
              'Content-Length': String(metadata.ContentLength),
            },
          },
          key,
          ['Content-Length'],
        )
      },
      async getDownloadUrl(key: string, expires: number): Promise<string> {
        return publicSigner.signatureUrlV4('GET', expires, undefined, key)
      },
      async put(key: string, content: unknown, metadata: Record<string, unknown> = {}): Promise<unknown> {
        return serverClient.put(key, content, { headers: normalizeHeaders(metadata) })
      },
      async writeFile(key: string, content: unknown, metadata: Record<string, unknown> = {}): Promise<unknown> {
        return serverClient.put(key, content, { headers: normalizeHeaders(metadata) })
      },
      async headFile(key: string): Promise<{ size: number; mimeType: string; etag: string; cacheControl: string; sha256: string; acl: string }> {
        if (!serverClient.head || !serverClient.getACL) throw new Error('OSS client does not support authoritative object metadata')
        const result = await serverClient.head(key)
        const headers = result.res?.headers
        let acl = ''
        try {
          acl = String((await serverClient.getACL(key)).acl || '')
        } catch (error) {
          const denied = error as { code?: unknown; status?: unknown; statusCode?: unknown }
          const status = Number(denied.status ?? denied.statusCode)
          if (denied.code !== 'AccessDenied' || status !== 403) throw error
          acl = 'unavailable'
        }
        const size = Number(firstHeader(headers, 'content-length'))
        if (!Number.isFinite(size) || size < 0) throw new Error(`OSS object ${key} has invalid content length`)
        const mimeType = (firstHeader(headers, 'content-type') || '').split(';', 1)[0]!.trim().toLowerCase()
        return {
          size,
          mimeType,
          etag: firstHeader(headers, 'etag') || '',
          cacheControl: firstHeader(headers, 'cache-control') || '',
          sha256: firstHeader(headers, 'x-oss-meta-sha256') || '',
          acl,
        }
      },
      async readFile(key: string, maxBytes?: number, options: { signal?: AbortSignal; timeoutMs?: number } = {}): Promise<unknown> {
        const byteLimit = Number(maxBytes)
        if (!Number.isSafeInteger(byteLimit) || byteLimit <= 0) throw new Error('OSS read byte limit must be a positive integer')
        if (!serverClient.getStream) throw new Error('OSS client does not support streaming downloads')
        const signal = options.signal
        if (options.timeoutMs !== undefined && (!Number.isSafeInteger(options.timeoutMs) || options.timeoutMs <= 0)) {
          throw new Error('OSS read timeout must be a positive integer')
        }
        const abortError = () => new Error(`OSS read aborted for ${key}`)
        if (signal?.aborted) throw abortError()

        // Ask OSS for one byte beyond the accepted limit. The byte-counting
        // guard below remains authoritative if a proxy ignores the range or
        // advertises a misleading Content-Length.
        const streamRequest = serverClient.getStream(key, {
          headers: { Range: `bytes=0-${byteLimit}` },
          ...(options.timeoutMs === undefined ? {} : { timeout: options.timeoutMs }),
        })
        const result = signal ? await new Promise<Awaited<ReturnType<NonNullable<OssClient['getStream']>>>>((resolve, reject) => {
          const onAbort = () => reject(abortError())
          signal.addEventListener('abort', onAbort, { once: true })
          streamRequest.then((value) => {
            signal.removeEventListener('abort', onAbort)
            if (signal.aborted) {
              value.stream.destroy?.()
              reject(abortError())
            } else resolve(value)
          }, (error) => {
            signal.removeEventListener('abort', onAbort)
            reject(error)
          })
        }) : await streamRequest
        const status = result.res?.status
        if (status !== undefined && status !== 200 && status !== 206) {
          throw new Error(`OSS download returned unexpected status ${status}`)
        }
        const advertised = Number(firstHeader(result.res?.headers, 'content-length'))
        if (Number.isFinite(advertised) && advertised > byteLimit) {
          result.stream.destroy?.()
          throw new Error(`OSS object ${key} exceeds ${byteLimit} byte limit`)
        }

        const chunks: Buffer[] = []
        let total = 0
        const onAbort = () => result.stream.destroy?.(abortError())
        signal?.addEventListener('abort', onAbort, { once: true })
        try {
          for await (const value of result.stream) {
            const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value as any)
            total += chunk.byteLength
            if (total > byteLimit) {
              const error = new Error(`OSS object ${key} exceeds ${byteLimit} byte limit`)
              result.stream.destroy?.(error)
              throw error
            }
            chunks.push(chunk)
          }
        } catch (error) {
          result.stream.destroy?.()
          throw error
        } finally {
          signal?.removeEventListener('abort', onAbort)
        }
        return Buffer.concat(chunks, total)
      },
      async readFileExactRanges(key: string, maxBytes?: number, options: { signal?: AbortSignal; timeoutMs?: number } = {}): Promise<Buffer> {
        const byteLimit = Number(maxBytes)
        if (!Number.isSafeInteger(byteLimit) || byteLimit <= 0) throw new Error('OSS read byte limit must be a positive integer')
        if (!serverClient.head || !serverClient.getStream) throw new Error('OSS client does not support exact range downloads')
        if (options.timeoutMs !== undefined && (!Number.isSafeInteger(options.timeoutMs) || options.timeoutMs <= 0)) {
          throw new Error('OSS read timeout must be a positive integer')
        }
        const signal = options.signal
        const abortError = () => new Error(`OSS read aborted for ${key}`)
        if (signal?.aborted) throw abortError()
        const metadata = await serverClient.head(key)
        const size = Number(firstHeader(metadata.res?.headers, 'content-length'))
        if (!Number.isSafeInteger(size) || size < 0) throw new Error(`OSS object ${key} has invalid content length`)
        if (size > byteLimit) throw new Error(`OSS object ${key} exceeds ${byteLimit} byte limit`)
        if (size === 0) return Buffer.alloc(0)

        const readRange = async (start: number, end: number) => {
          const expectedLength = end - start + 1
          let lastError: unknown
          for (let attempt = 1; attempt <= EXACT_RANGE_ATTEMPTS; attempt += 1) {
            let result: Awaited<ReturnType<NonNullable<OssClient['getStream']>>> | undefined
            try {
              if (signal?.aborted) throw abortError()
              result = await serverClient.getStream!(key, {
                headers: { Range: `bytes=${start}-${end}` },
                ...(options.timeoutMs === undefined ? {} : { timeout: options.timeoutMs }),
              })
              if (result.res?.status !== undefined && result.res.status !== 206) {
                throw new Error(`OSS range download returned unexpected status ${result.res.status}`)
              }
              const advertised = Number(firstHeader(result.res?.headers, 'content-length'))
              if (Number.isFinite(advertised) && advertised !== expectedLength) {
                throw new Error(`OSS range response length mismatch for ${key}`)
              }
              const chunks: Buffer[] = []
              let total = 0
              const onAbort = () => result?.stream.destroy?.(abortError())
              signal?.addEventListener('abort', onAbort, { once: true })
              try {
                for await (const value of result.stream) {
                  const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value as any)
                  total += chunk.byteLength
                  if (total > expectedLength) throw new Error(`OSS range response length mismatch for ${key}`)
                  chunks.push(chunk)
                }
              } finally {
                signal?.removeEventListener('abort', onAbort)
              }
              if (total !== expectedLength) throw new Error(`OSS range response length mismatch for ${key}`)
              return Buffer.concat(chunks, total)
            } catch (error) {
              result?.stream.destroy?.()
              if (signal?.aborted) throw abortError()
              lastError = error
            }
          }
          throw lastError
        }

        const chunks: Buffer[] = []
        for (let start = 0; start < size; start += EXACT_RANGE_CHUNK_BYTES) {
          chunks.push(await readRange(start, Math.min(size - 1, start + EXACT_RANGE_CHUNK_BYTES - 1)))
        }
        return Buffer.concat(chunks, size)
      },
      async listFiles(options: { Prefix?: string; Marker?: string } = {}) {
        const contents: Array<Record<string, unknown>> = []
        let marker = options.Marker
        do {
          const query: Record<string, unknown> = { prefix: options.Prefix }
          if (marker !== undefined) query.marker = marker
          const page = await serverClient.list(query)
          contents.push(...(page.objects || []).map(normalizeObject))
          if (!page.isTruncated) break
          const nextMarker = page.nextMarker || page.objects?.at(-1)?.name
          if (!nextMarker || nextMarker === marker) throw new Error('OSS list pagination did not advance')
          marker = nextMarker
        } while (true)
        return { Contents: contents, IsTruncated: false }
      },
      async deleteFile(key: string): Promise<void> {
        await serverClient.delete(key)
      },
    }
  }

  return {
    bucket,
    async probe(): Promise<void> {
      const { acl } = await serverClient.getBucketACL(config.bucket)
      if (acl !== 'private') throw new Error(`OSS bucket must be private; current ACL is ${acl || 'unknown'}`)
      await serverClient.list({ prefix: '__paperbanana_health__/', 'max-keys': 1 })
    },
  }
}

export type OssAdapter = ReturnType<typeof createOssAdapter>
