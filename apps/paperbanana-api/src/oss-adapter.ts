import OSS from 'ali-oss'

type OssConfig = {
  region: string
  accessKeyId: string
  accessKeySecret: string
  bucket: string
  internalEndpoint: string
  publicEndpoint: string
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
  getObjectMeta?(key: string): Promise<{
    status?: number
    res?: { status?: number; headers?: Record<string, string | string[] | undefined> }
  }>
  getStream?(key: string, options?: Record<string, unknown>): Promise<{
    stream: AsyncIterable<unknown> & { destroy?(error?: Error): void }
    res?: { status?: number; headers?: Record<string, string | string[] | undefined> }
  }>
  getBucketACL(name: string): Promise<{ acl: string }>
  delete(key: string): Promise<unknown>
  list(query: Record<string, unknown>): Promise<any>
}

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
    serverClient: new OSS({ ...common, endpoint: config.internalEndpoint }),
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
      async headFile(key: string): Promise<{ size: number; mimeType: string; etag: string }> {
        if (!serverClient.getObjectMeta) throw new Error('OSS client does not support object metadata')
        const result = await serverClient.getObjectMeta(key)
        const headers = result.res?.headers
        const size = Number(firstHeader(headers, 'content-length'))
        if (!Number.isFinite(size) || size < 0) throw new Error(`OSS object ${key} has invalid content length`)
        const mimeType = (firstHeader(headers, 'content-type') || '').split(';', 1)[0]!.trim().toLowerCase()
        return {
          size,
          mimeType,
          etag: firstHeader(headers, 'etag') || '',
        }
      },
      async readFile(key: string, maxBytes?: number): Promise<unknown> {
        const byteLimit = Number(maxBytes)
        if (!Number.isSafeInteger(byteLimit) || byteLimit <= 0) throw new Error('OSS read byte limit must be a positive integer')
        if (!serverClient.getStream) throw new Error('OSS client does not support streaming downloads')

        // Ask OSS for one byte beyond the accepted limit. The byte-counting
        // guard below remains authoritative if a proxy ignores the range or
        // advertises a misleading Content-Length.
        const result = await serverClient.getStream(key, { headers: { Range: `bytes=0-${byteLimit}` } })
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
        }
        return Buffer.concat(chunks, total)
      },
      async listFiles(options: { Prefix?: string; Marker?: string } = {}) {
        const contents: Array<Record<string, unknown>> = []
        let marker = options.Marker
        do {
          const page = await serverClient.list({ prefix: options.Prefix, marker })
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
