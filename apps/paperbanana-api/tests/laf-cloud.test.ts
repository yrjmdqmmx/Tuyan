import assert from 'node:assert/strict'
import test from 'node:test'

import cloud, { configureLafCloud } from '../src/laf-cloud.js'

test('Laf cloud facade forwards legacy Mongo and storage calls to configured Node adapters', () => {
  const collection = { findOne() {} }
  const bucket = { writeFile() {} }
  const mongo = {
    db: {
      collection(name: string) {
        assert.equal(name, 'paperbanana_jobs')
        return collection
      },
    },
  }
  const storage = {
    bucket(name: string) {
      assert.equal(name, 'paperbanana-private')
      return bucket
    },
  }

  configureLafCloud({ mongo: mongo as any, storage: storage as any })

  assert.equal(cloud.mongo.db.collection('paperbanana_jobs'), collection)
  assert.equal(cloud.storage.bucket('paperbanana-private'), bucket)
})
