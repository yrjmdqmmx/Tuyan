import assert from 'node:assert/strict'
import test from 'node:test'

import { loadConfig } from '../src/config.js'

const validEnv = {
  PAPERBANANA_GATEWAY_TOKEN: 'service-secret',
  PAPERBANANA_SINGLE_REPLICA: 'true',
  PAPERBANANA_STRICT_OBJECT_STORAGE: 'true',
  MONGODB_URI: 'mongodb://mongo.internal:27017',
  MONGODB_BUSINESS_DB: 'paperbanana_business',
  PAPERBANANA_BUCKET: 'paperbanana-private',
  OSS_REGION: 'oss-cn-hongkong',
  OSS_ACCESS_KEY_ID: 'access-id',
  OSS_ACCESS_KEY_SECRET: 'access-secret',
}

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
