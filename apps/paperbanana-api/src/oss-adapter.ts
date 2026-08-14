import OSS from 'ali-oss'

type OssConfig = {
  region: string
  accessKeyId: string
  accessKeySecret: string
  bucket: string
  secure: true
  pathStyle: false
}

type OssClient = {
  signatureUrl(key: string, options: Record<string, unknown>): string
  put(key: string, content: unknown, options?: Record<string, unknown>): Promise<unknown>
  get?(key: string): Promise<unknown>
  getBucketACL(name: string): Promise<{ acl: string }>
  delete(key: string): Promise<unknown>
  list(query: Record<string, unknown>): Promise<any>
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

export function createOssAdapter(
  config: OssConfig,
  dependencies: { client?: OssClient } = {},
) {
  const client: OssClient = dependencies.client || new OSS({
    region: config.region,
    accessKeyId: config.accessKeyId,
    accessKeySecret: config.accessKeySecret,
    bucket: config.bucket,
    secure: true,
    authorizationV4: true,
  }) as unknown as OssClient

  function bucket(name: string) {
    if (name !== config.bucket) throw new Error(`Unexpected OSS bucket: ${name}`)
    return {
      async getUploadUrl(key: string, expires: number): Promise<string> {
        return client.signatureUrl(key, { method: 'PUT', expires })
      },
      async getDownloadUrl(key: string, expires: number): Promise<string> {
        return client.signatureUrl(key, { method: 'GET', expires })
      },
      async put(key: string, content: unknown, metadata: Record<string, unknown> = {}): Promise<unknown> {
        return client.put(key, content, { headers: normalizeHeaders(metadata) })
      },
      async writeFile(key: string, content: unknown, metadata: Record<string, unknown> = {}): Promise<unknown> {
        return client.put(key, content, { headers: normalizeHeaders(metadata) })
      },
      async readFile(key: string): Promise<unknown> {
        if (!client.get) throw new Error('OSS client does not support downloads')
        return client.get(key)
      },
      async listFiles(options: { Prefix?: string; Marker?: string } = {}) {
        const contents: Array<Record<string, unknown>> = []
        let marker = options.Marker
        do {
          const page = await client.list({ prefix: options.Prefix, marker })
          contents.push(...(page.objects || []).map(normalizeObject))
          if (!page.isTruncated) break
          const nextMarker = page.nextMarker || page.objects?.at(-1)?.name
          if (!nextMarker || nextMarker === marker) throw new Error('OSS list pagination did not advance')
          marker = nextMarker
        } while (true)
        return { Contents: contents, IsTruncated: false }
      },
      async deleteFile(key: string): Promise<void> {
        await client.delete(key)
      },
    }
  }

  return {
    bucket,
    async probe(): Promise<void> {
      const { acl } = await client.getBucketACL(config.bucket)
      if (acl !== 'private') throw new Error(`OSS bucket must be private; current ACL is ${acl || 'unknown'}`)
      await client.list({ prefix: '__paperbanana_health__/', 'max-keys': 1 })
    },
  }
}

export type OssAdapter = ReturnType<typeof createOssAdapter>
