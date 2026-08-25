import assert from 'node:assert/strict'
import test from 'node:test'

import { loadConfig } from '../src/config.js'

const validEnv = {
  PAPERBANANA_GATEWAY_TOKEN: 'service-secret',
  PAPERBANANA_SINGLE_REPLICA: 'true',
  PAPERBANANA_STRICT_OBJECT_STORAGE: 'true',
  PAPERBANANA_PROVIDER_EGRESS_MODE: 'disabled',
  MONGODB_URI: 'mongodb://mongo.internal:27017',
  MONGODB_BUSINESS_DB: 'paperbanana_business',
  PAPERBANANA_BUCKET: 'paperbanana-private',
  OSS_REGION: 'oss-cn-hongkong',
  OSS_INTERNAL_ENDPOINT: 'https://oss-cn-hongkong-internal.aliyuncs.com',
  OSS_PUBLIC_ENDPOINT: 'https://oss-cn-hongkong.aliyuncs.com',
  OSS_ACCESS_KEY_ID: 'access-id',
  OSS_ACCESS_KEY_SECRET: 'access-secret',
}

test('startup config requires an explicit provider egress mode', () => {
  for (const value of ['', 'Disabled', 'sg', 'direct', ' disabled ']) {
    assert.throws(
      () => loadConfig({ ...validEnv, PAPERBANANA_PROVIDER_EGRESS_MODE: value }),
      /PAPERBANANA_PROVIDER_EGRESS_MODE must be exactly disabled or sg-required/,
    )
  }
})

test('sg-required accepts only the fixed credential-free Singapore proxy origin', () => {
  const accepted = loadConfig({
    ...validEnv,
    PAPERBANANA_PROVIDER_EGRESS_MODE: 'sg-required',
    PAPERBANANA_SG_PROXY_URL: 'http://10.77.0.2:3128',
  })
  assert.deepEqual(accepted.providerEgress, {
    mode: 'sg-required',
    proxyUrl: 'http://10.77.0.2:3128',
  })

  for (const value of [
    '',
    'https://10.77.0.2:3128',
    'http://user:password@10.77.0.2:3128',
    'http://10.77.0.2:3128/path',
    'http://10.77.0.2:3128?target=evil',
    'http://10.77.0.2:3128#fragment',
    'http://127.0.0.1:3128',
    'http://10.77.0.3:3128',
    'http://10.77.0.2:8080',
    'not-a-url',
  ]) {
    assert.throws(
      () => loadConfig({
        ...validEnv,
        PAPERBANANA_PROVIDER_EGRESS_MODE: 'sg-required',
        PAPERBANANA_SG_PROXY_URL: value,
      }),
      /PAPERBANANA_SG_PROXY_URL must be the approved Singapore proxy origin/,
    )
  }
})

test('disabled provider egress does not require or expose a proxy URL', () => {
  assert.deepEqual(loadConfig(validEnv).providerEgress, { mode: 'disabled' })
})

test('benchmark API is disabled by default and enabled only with isolated Mongo, OSS and immutable code provenance', () => {
  assert.equal(loadConfig(validEnv).benchmark, undefined)
  const enabled = loadConfig({
    ...validEnv,
    PAPERBANANA_BENCH_API_ENABLED: 'true',
    PAPERBANANA_BENCH_MONGODB_URI: 'mongodb://benchmark-api:secret@mongodb:27017/paperbanana_benchmark',
    PAPERBANANA_BENCH_MONGO_DB: 'paperbanana_benchmark',
    PAPERBANANA_BENCH_OSS_REGION: 'oss-cn-hongkong',
    PAPERBANANA_BENCH_OSS_ACCESS_KEY_ID: 'bench-read-id',
    PAPERBANANA_BENCH_OSS_ACCESS_KEY_SECRET: 'bench-read-secret',
    PAPERBANANA_BENCH_OSS_BUCKET: 'paperbanana-bench-private',
    PAPERBANANA_BENCH_OSS_INTERNAL_ENDPOINT: 'https://oss-cn-hongkong-internal.aliyuncs.com',
    PAPERBANANA_BENCH_OSS_PUBLIC_ENDPOINT: 'https://oss-cn-hongkong.aliyuncs.com',
    PAPERBANANA_CODE_SHA: 'eb31b2b3da4cbc73a436711f7183fef9df119c6b',
    PAPERBANANA_BENCH_REVIEW_SIGNING_SECRET: 'review-signing-secret',
  })
  assert.equal(enabled.benchmark?.mongodb.database, 'paperbanana_benchmark')
  assert.equal(enabled.benchmark?.oss.bucket, 'paperbanana-bench-private')
  assert.throws(() => loadConfig({ ...validEnv, PAPERBANANA_BENCH_API_ENABLED: 'true' }), /PAPERBANANA_CODE_SHA|PAPERBANANA_BENCH/)
})

test('startup config requires the internal gateway token', () => {
  assert.throws(
    () => loadConfig({ ...validEnv, PAPERBANANA_GATEWAY_TOKEN: '' }),
    /PAPERBANANA_GATEWAY_TOKEN is required/,
  )
})

test('startup config rejects multi-replica mode until job leases exist', () => {
  assert.throws(
    () => loadConfig({ ...validEnv, PAPERBANANA_SINGLE_REPLICA: 'false' }),
    /PAPERBANANA_SINGLE_REPLICA=true is required/,
  )
})

test('startup config requires strict object storage mode', () => {
  for (const value of ['', 'false', ' true ']) {
    assert.throws(
      () => loadConfig({ ...validEnv, PAPERBANANA_STRICT_OBJECT_STORAGE: value }),
      /PAPERBANANA_STRICT_OBJECT_STORAGE=true is required/,
    )
  }
})

test('startup config requires Mongo and private OSS settings', () => {
  for (const name of ['MONGODB_URI', 'PAPERBANANA_BUCKET', 'OSS_REGION', 'OSS_ACCESS_KEY_ID', 'OSS_ACCESS_KEY_SECRET']) {
    assert.throws(
      () => loadConfig({ ...validEnv, [name]: '' }),
      new RegExp(`${name} is required`),
    )
  }
})

test('startup config defaults the business database and never enables path-style OSS', () => {
  const config = loadConfig({ ...validEnv, MONGODB_BUSINESS_DB: '' })

  assert.equal(config.mongodb.database, 'paperbanana_business')
  assert.equal(config.oss.region, 'oss-cn-hongkong')
  assert.equal(config.oss.bucket, 'paperbanana-private')
  assert.equal(config.oss.pathStyle, false)
})

test('startup config provides bounded admission and readiness defaults', () => {
  const config = loadConfig(validEnv)

  assert.deepEqual(config.admission, {
    maxActive: 1,
    maxPending: 2,
    maxPerOwner: 1,
    maxPerIp: 1,
  })
  assert.equal(config.readinessProbeTimeoutMs, 2000)
  assert.equal(config.referenceImageMaxBytes, 5 * 1024 * 1024)
  assert.equal(config.providerImageMaxBytes, 20 * 1024 * 1024)
})

test('startup config rejects unsafe admission and readiness bounds', () => {
  const invalid = [
    ['PAPERBANANA_MAX_ACTIVE_JOBS', '0'],
    ['PAPERBANANA_MAX_ACTIVE_JOBS', '9'],
    ['PAPERBANANA_MAX_PENDING_JOBS', '-1'],
    ['PAPERBANANA_MAX_PENDING_JOBS', '33'],
    ['PAPERBANANA_MAX_JOBS_PER_OWNER', '0'],
    ['PAPERBANANA_MAX_JOBS_PER_IP', '9'],
    ['PAPERBANANA_READINESS_PROBE_TIMEOUT_MS', '99'],
    ['PAPERBANANA_READINESS_PROBE_TIMEOUT_MS', '10001'],
    ['PAPERBANANA_MAX_REFERENCE_BYTES', String(5 * 1024 * 1024 - 1)],
    ['PAPERBANANA_MAX_REFERENCE_BYTES', String(5 * 1024 * 1024 + 1)],
    ['PAPERBANANA_MAX_PROVIDER_IMAGE_BYTES', String(5 * 1024 * 1024 - 1)],
    ['PAPERBANANA_MAX_PROVIDER_IMAGE_BYTES', String(50 * 1024 * 1024 + 1)],
  ]

  for (const [name, value] of invalid) {
    assert.throws(() => loadConfig({ ...validEnv, [name]: value }), new RegExp(name))
  }
})

test('startup config requires distinct internal and public OSS endpoints', () => {
  for (const env of [
    { ...validEnv, OSS_INTERNAL_ENDPOINT: '' },
    { ...validEnv, OSS_PUBLIC_ENDPOINT: '' },
    { ...validEnv, OSS_PUBLIC_ENDPOINT: validEnv.OSS_INTERNAL_ENDPOINT },
    { ...validEnv, OSS_INTERNAL_ENDPOINT: validEnv.OSS_PUBLIC_ENDPOINT },
    { ...validEnv, OSS_PUBLIC_ENDPOINT: 'http://127.0.0.1:9000' },
    { ...validEnv, OSS_PUBLIC_ENDPOINT: 'https://oss-cn-hongkong.aliyuncs.com:8443/' },
  ]) {
    assert.throws(() => loadConfig(env), /OSS_(INTERNAL|PUBLIC)_ENDPOINT/)
  }

  const config = loadConfig(validEnv)
  assert.equal(config.oss.internalEndpoint, validEnv.OSS_INTERNAL_ENDPOINT)
  assert.equal(config.oss.publicEndpoint, validEnv.OSS_PUBLIC_ENDPOINT)
})
