import assert from 'node:assert/strict'
import test from 'node:test'

import { createOssAdapter } from '../src/oss-adapter.js'

const config = {
  region: 'oss-cn-hongkong',
  accessKeyId: 'access-id',
  accessKeySecret: 'access-secret',
  bucket: 'paperbanana-private',
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
  const bucket = createOssAdapter(config, { client: client as any }).bucket('paperbanana-private')

  const result = await bucket.listFiles({ Prefix: 'references/a/' })

  assert.deepEqual(queries, [
    { prefix: 'references/a/', marker: undefined },
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
  const client = {
    signatureUrl(key: string, options: unknown) {
      calls.push(['signatureUrl', key, options])
      return `https://signed.invalid/${key}`
    },
    async put(key: string, content: unknown, options: unknown) {
      calls.push(['put', key, content, options])
      return { name: key }
    },
    async delete(key: string) {
      calls.push(['delete', key])
    },
  }
  const bucket = createOssAdapter(config, { client: client as any }).bucket('paperbanana-private')
  const bytes = Buffer.from('png')

  assert.equal(await bucket.getUploadUrl('references/a.png', 900), 'https://signed.invalid/references/a.png')
  assert.equal(await bucket.getDownloadUrl('results/a.png', 3600), 'https://signed.invalid/results/a.png')
  await bucket.writeFile('results/a.png', bytes, { ContentType: 'image/png', 'x-oss-meta-origin': 'paperbanana' })
  await bucket.deleteFile('results/a.png')

  assert.deepEqual(calls, [
    ['signatureUrl', 'references/a.png', { method: 'PUT', expires: 900 }],
    ['signatureUrl', 'results/a.png', { method: 'GET', expires: 3600 }],
    ['put', 'results/a.png', bytes, { headers: { 'Content-Type': 'image/png', 'x-oss-meta-origin': 'paperbanana' } }],
    ['delete', 'results/a.png'],
  ])
})

test('object-store write failures propagate without a Mongo data-URL fallback', async () => {
  const client = {
    async put() { throw new Error('OSS unavailable') },
  }
  const bucket = createOssAdapter(config, { client: client as any }).bucket('paperbanana-private')

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
  const adapter = createOssAdapter(config, { client: client as any })

  await assert.rejects(adapter.probe(), /OSS bucket must be private/)
})
