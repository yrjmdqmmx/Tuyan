import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import test from 'node:test'

import * as ossAdapter from '../src/oss-adapter.js'

const { createOssAdapter } = ossAdapter

const config = {
  region: 'oss-cn-hongkong',
  accessKeyId: 'access-id',
  accessKeySecret: 'access-secret',
  bucket: 'paperbanana-private',
  internalEndpoint: 'https://oss-cn-hongkong-internal.aliyuncs.com',
  publicEndpoint: 'https://oss-cn-hongkong.aliyuncs.com',
  secure: true as const,
  pathStyle: false as const,
}

test('listFiles follows every OSS marker and normalizes keys while preserving metadata', async () => {
  const queries: unknown[] = []
  const client = {
    async list(query: any) {
      queries.push(query)
      if (!query.marker) {
        return {
          objects: [{ name: 'references/a/one.png', size: 10, etag: 'etag-1', lastModified: 't1', custom: 'keep-1' }],
          isTruncated: true,
          nextMarker: 'page-2',
        }
      }
      return {
        objects: [{ name: 'references/a/two.svg', size: 20, etag: 'etag-2', lastModified: 't2', custom: 'keep-2' }],
        isTruncated: false,
      }
    },
  }
  const bucket = createOssAdapter(config, { serverClient: client as any, publicSigner: {} as any }).bucket('paperbanana-private')

  const result = await bucket.listFiles({ Prefix: 'references/a/' })

  assert.deepEqual(queries, [
    { prefix: 'references/a/' },
    { prefix: 'references/a/', marker: 'page-2' },
  ])
  assert.deepEqual(result, {
    Contents: [
      {
        name: 'references/a/one.png', size: 10, etag: 'etag-1', lastModified: 't1', custom: 'keep-1',
        Key: 'references/a/one.png', Size: 10, ETag: 'etag-1', LastModified: 't1',
      },
      {
        name: 'references/a/two.svg', size: 20, etag: 'etag-2', lastModified: 't2', custom: 'keep-2',
        Key: 'references/a/two.svg', Size: 20, ETag: 'etag-2', LastModified: 't2',
      },
    ],
    IsTruncated: false,
  })
})

test('signed URLs and writes preserve object keys, HTTP method, and metadata', async () => {
  const calls: unknown[] = []
  const publicSigner = {
    async signatureUrlV4(method: string, expires: number, request: unknown, key: string, additionalHeaders?: string[]) {
      calls.push(['signatureUrlV4', method, expires, request, key, additionalHeaders])
      return `https://signed.invalid/${key}`
    },
  }
  const serverClient = {
    async put(key: string, content: unknown, options: unknown) {
      calls.push(['put', key, content, options])
      return { name: key }
    },
    async delete(key: string) {
      calls.push(['delete', key])
    },
  }
  const bucket = createOssAdapter(config, { serverClient: serverClient as any, publicSigner: publicSigner as any }).bucket('paperbanana-private')
  const bytes = Buffer.from('png')

  assert.equal(
    await bucket.getUploadUrl('references/a.png', 900, { ContentType: 'image/png', ContentLength: 3 }),
    'https://signed.invalid/references/a.png',
  )
  assert.equal(await bucket.getDownloadUrl('results/a.png', 3600), 'https://signed.invalid/results/a.png')
  await bucket.writeFile('results/a.png', bytes, { ContentType: 'image/png', 'x-oss-meta-origin': 'paperbanana' })
  await bucket.deleteFile('results/a.png')

  assert.deepEqual(calls, [
    ['signatureUrlV4', 'PUT', 900, {
      headers: { 'Content-Type': 'image/png', 'Content-Length': '3' },
    }, 'references/a.png', ['Content-Length']],
    ['signatureUrlV4', 'GET', 3600, undefined, 'results/a.png', undefined],
    ['put', 'results/a.png', bytes, { headers: { 'Content-Type': 'image/png', 'x-oss-meta-origin': 'paperbanana' } }],
    ['delete', 'results/a.png'],
  ])
})

test('real ali-oss clients keep server traffic internal and signed URLs public', async () => {
  assert.equal(typeof (ossAdapter as any).createOssClients, 'function')
  const clients = (ossAdapter as any).createOssClients({
    ...config,
    accessKeyId: 'test-access-id',
    accessKeySecret: 'test-access-secret',
  })

  const internal = new URL(await clients.serverClient.signatureUrlV4('GET', 60, undefined, 'results/a.png'))
  const signed = new URL(await clients.publicSigner.signatureUrlV4(
    'PUT',
    60,
    { headers: { 'Content-Type': 'image/png', 'Content-Length': '3' } },
    'references/a.png',
    ['Content-Length'],
  ))

  assert.equal(internal.hostname, 'paperbanana-private.oss-cn-hongkong-internal.aliyuncs.com')
  assert.equal(signed.hostname, 'paperbanana-private.oss-cn-hongkong.aliyuncs.com')
  assert.equal(signed.pathname, '/references/a.png')
  assert.equal(signed.searchParams.get('x-oss-signature-version'), 'OSS4-HMAC-SHA256')
  assert.equal(signed.searchParams.get('x-oss-expires'), '60')
  assert.equal(signed.searchParams.get('x-oss-additional-headers'), 'content-length')
})

test('public server endpoint mode changes only server traffic while signed URLs remain public', async () => {
  const clients = ossAdapter.createOssClients({
    ...config,
    serverEndpointMode: 'public',
    accessKeyId: 'test-access-id',
    accessKeySecret: 'test-access-secret',
  })

  const server = new URL(await clients.serverClient.signatureUrlV4('GET', 60, undefined, 'bench/evidence.json'))
  const signed = new URL(await clients.publicSigner.signatureUrlV4('GET', 60, undefined, 'bench/evidence.json'))

  assert.equal(server.hostname, 'paperbanana-private.oss-cn-hongkong.aliyuncs.com')
  assert.equal(signed.hostname, 'paperbanana-private.oss-cn-hongkong.aliyuncs.com')
  assert.equal(signed.pathname, '/bench/evidence.json')
})

test('object-store write failures propagate without a Mongo data-URL fallback', async () => {
  const client = {
    async put() { throw new Error('OSS unavailable') },
  }
  const bucket = createOssAdapter(config, { serverClient: client as any, publicSigner: {} as any }).bucket('paperbanana-private')

  await assert.rejects(
    bucket.writeFile('results/a.png', Buffer.from('png'), { ContentType: 'image/png' }),
    /OSS unavailable/,
  )
})

test('OSS readiness rejects any bucket that is not private', async () => {
  const client = {
    async getBucketACL(name: string) {
      assert.equal(name, 'paperbanana-private')
      return { acl: 'public-read' }
    },
    async list() { return { objects: [], isTruncated: false } },
  }
  const adapter = createOssAdapter(config, { serverClient: client as any, publicSigner: {} as any })

  await assert.rejects(adapter.probe(), /OSS bucket must be private/)
})

test('headFile normalizes authoritative object size and content type from the internal client', async () => {
  const serverClient = {
    async head(key: string) {
      assert.equal(key, 'references/a.png')
      return {
        status: 200,
        res: { headers: {
          'content-length': '123', 'content-type': 'image/png', etag: 'etag-1',
          'cache-control': 'private, no-store', 'x-oss-meta-sha256': 'a'.repeat(64),
        } },
      }
    },
    async getACL(key: string) { assert.equal(key, 'references/a.png'); return { acl: 'private' } },
  }
  const bucket = createOssAdapter(config, { serverClient: serverClient as any, publicSigner: {} as any })
    .bucket('paperbanana-private')

  assert.deepEqual(await bucket.headFile('references/a.png'), {
    size: 123,
    mimeType: 'image/png',
    etag: 'etag-1',
    cacheControl: 'private, no-store',
    sha256: 'a'.repeat(64),
    acl: 'private',
  })
})

test('headFile preserves verified HEAD metadata when object ACL inspection is explicitly denied', async () => {
  const serverClient = {
    async head() {
      return { status: 200, res: { headers: {
        'content-length': '321', 'content-type': 'image/webp', etag: 'etag-2',
        'cache-control': 'public, max-age=31536000, immutable', 'x-oss-meta-sha256': 'b'.repeat(64),
      } } }
    },
    async getACL() { throw Object.assign(new Error('denied'), { code: 'AccessDenied', status: 403 }) },
  }
  const bucket = createOssAdapter(config, { serverClient: serverClient as any, publicSigner: {} as any })
    .bucket('paperbanana-private')

  assert.deepEqual(await bucket.headFile('bench/scientific-v2/public/hash/full.webp'), {
    size: 321,
    mimeType: 'image/webp',
    etag: 'etag-2',
    cacheControl: 'public, max-age=31536000, immutable',
    sha256: 'b'.repeat(64),
    acl: 'unavailable',
  })
})

test('headFile does not hide non-permission ACL failures', async () => {
  const serverClient = {
    async head() { return { status: 200, res: { headers: { 'content-length': '1', 'content-type': 'image/png' } } } },
    async getACL() { throw new Error('network failed') },
  }
  const bucket = createOssAdapter(config, { serverClient: serverClient as any, publicSigner: {} as any })
    .bucket('paperbanana-private')
  await assert.rejects(() => bucket.headFile('bench/scientific-v2/private/objects/hash.png'), /network failed/)
})

test('readFile enforces a hard stream cap even when metadata is missing or misleading', async () => {
  const streams = [
    { headers: {}, chunks: [Buffer.from('123'), Buffer.from('456')] },
    { headers: { 'content-length': '2' }, chunks: [Buffer.from('123456')] },
  ]
  const serverClient = {
    async getStream(_key: string, options: any) {
      assert.deepEqual(options, { headers: { Range: 'bytes=0-5' } })
      const next = streams.shift()!
      return { stream: Readable.from(next.chunks), res: { status: 206, headers: next.headers } }
    },
  }
  const bucket = createOssAdapter(config, { serverClient: serverClient as any, publicSigner: {} as any })
    .bucket('paperbanana-private')

  await assert.rejects(bucket.readFile('references/a.png', 5), /exceeds 5 byte limit/)
  await assert.rejects(bucket.readFile('references/a.png', 5), /exceeds 5 byte limit/)
})

test('readFile never exposes an unbounded whole-object fallback', async () => {
  let wholeObjectReads = 0
  const serverClient = {
    async get() { wholeObjectReads += 1; return Buffer.from('unbounded') },
  }
  const bucket = createOssAdapter(config, { serverClient: serverClient as any, publicSigner: {} as any })
    .bucket('paperbanana-private')

  await assert.rejects(bucket.readFile('references/a.png'), /byte limit must be a positive integer/)
  assert.equal(wholeObjectReads, 0)
})

test('readFileExactRanges retries incomplete bounded chunks and reconstructs the authoritative object size', async () => {
  const bytes = Buffer.alloc(4 * 1024 * 1024 + 4, 7)
  const ranges: string[] = []
  let firstRangeAttempts = 0
  const serverClient = {
    async head() {
      return { status: 200, res: { headers: { 'content-length': String(bytes.length) } } }
    },
    async getStream(_key: string, options: any) {
      const range = String(options.headers.Range)
      ranges.push(range)
      const match = /^bytes=(\d+)-(\d+)$/.exec(range)!
      const start = Number(match[1])
      const end = Number(match[2])
      const expected = bytes.subarray(start, end + 1)
      if (start === 0 && firstRangeAttempts++ === 0) {
        return { stream: Readable.from([expected.subarray(0, expected.length - 1)]), res: { status: 206, headers: {} } }
      }
      return { stream: Readable.from([expected]), res: { status: 206, headers: { 'content-length': String(expected.length) } } }
    },
  }
  const bucket = createOssAdapter(config, { serverClient: serverClient as any, publicSigner: {} as any })
    .bucket('paperbanana-private')

  const result = await bucket.readFileExactRanges('bench/scientific-v2/private/objects/hash.png', bytes.length)

  assert.deepEqual(result, bytes)
  assert.deepEqual(ranges, [
    'bytes=0-4194303',
    'bytes=0-4194303',
    'bytes=4194304-4194307',
  ])
})

test('readFileExactRanges rejects an oversized object before requesting any bytes', async () => {
  let rangeCalls = 0
  const serverClient = {
    async head() { return { status: 200, res: { headers: { 'content-length': '6' } } } },
    async getStream() { rangeCalls += 1; throw new Error('must not read') },
  }
  const bucket = createOssAdapter(config, { serverClient: serverClient as any, publicSigner: {} as any })
    .bucket('paperbanana-private')

  await assert.rejects(bucket.readFileExactRanges('bench/scientific-v2/private/objects/hash.png', 5), /exceeds 5 byte limit/)
  assert.equal(rangeCalls, 0)
})

test('readFile abort destroys the underlying OSS stream instead of only abandoning its promise', async () => {
  let destroyed = false
  let streamOptions: any
  const stream = new Readable({ read() {} })
  const originalDestroy = stream.destroy.bind(stream)
  stream.destroy = ((error?: Error) => { destroyed = true; return originalDestroy(error) }) as any
  const bucket = createOssAdapter(config, {
    serverClient: { async getStream(_key: string, options: any) { streamOptions = options; return { stream, res: { status: 200, headers: {} } } } } as any,
    publicSigner: {} as any,
  }).bucket('paperbanana-private')
  const controller = new AbortController()
  const pending = bucket.readFile('bench/objects/hash.png', 100, { signal: controller.signal, timeoutMs: 25 })
  controller.abort()
  await assert.rejects(pending, /aborted/i)
  assert.equal(destroyed, true)
  assert.equal(streamOptions.timeout, 25)
})

test('readFile aborts promptly even while ali-oss getStream has not resolved', async () => {
  const bucket = createOssAdapter(config, {
    serverClient: { async getStream() { return new Promise(() => {}) } } as any,
    publicSigner: {} as any,
  }).bucket('paperbanana-private')
  const controller = new AbortController()
  const pending = bucket.readFile('bench/objects/hash.png', 100, { signal: controller.signal, timeoutMs: 25 })
  controller.abort()
  await assert.rejects(pending, /aborted/i)
})
