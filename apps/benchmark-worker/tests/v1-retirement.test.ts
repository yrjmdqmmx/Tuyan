import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'

import { canonicalHash } from '@paperbanana/benchmark-core'

import {
  V1_RETIREMENT_IDENTITY,
  buildV1RetirementInventory,
  deleteExclusiveV1Objects,
} from '../src/v1-retirement.js'

const sha = (value: string | Buffer) => createHash('sha256').update(value).digest('hex')

function fixture() {
  const rawBytes = Buffer.from('v1-raw-image')
  const rawHash = sha(rawBytes)
  const publicBytes = Buffer.from('v1-public-webp')
  const publicHash = sha(publicBytes)
  const sharedBytes = Buffer.from('shared-v1-image')
  const sharedHash = sha(sharedBytes)
  const releaseBase = {
    ...V1_RETIREMENT_IDENTITY,
    profileStatus: 'published',
    models: [{ profileId: 'model-a:codex_single:codex-single-2026-08-v1', ranked: true }],
  }
  const releaseHash = canonicalHash(releaseBase)
  const release = { _id: 'release-v1', ...releaseBase, releaseHash }
  const v2 = { _id: 'release-v2', suiteId: 'pb-scientific-figure-v2', evaluationMode: 'codex_scientific_v2', evaluationEpoch: 'codex-scientific-2026-09-v1', profileStatus: 'published', releaseHash: 'f'.repeat(64) }
  const run = { _id: 'run-v1', ...V1_RETIREMENT_IDENTITY, state: 'published' }
  const samples = [
    {
      _id: 'sample-v1-a', runId: 'run-v1', imageHash: rawHash, imageObjectKey: `bench/objects/${rawHash}.png`,
      publicRenditions: [{ kind: 'detail', objectKey: `bench/public/evidence/${rawHash}/detail.webp`, imageHash: publicHash }],
    },
    { _id: 'sample-v1-shared', runId: 'run-v1', imageHash: sharedHash, imageObjectKey: `bench/objects/${sharedHash}.png` },
    { _id: 'sample-other-shared', runId: 'run-other', imageHash: sharedHash, imageObjectKey: `bench/objects/${sharedHash}.png` },
  ]
  const publicEvidence = [{
    _id: 'public-v1', sourceReleaseHash: releaseHash, sampleId: 'sample-v1-a', imageHash: rawHash,
    variants: [{ kind: 'detail', objectKey: `bench/public/evidence/${rawHash}/detail.webp`, imageHash: publicHash }],
  }]
  const bytes = new Map([
    [`bench/objects/${rawHash}.png`, rawBytes],
    [`bench/public/evidence/${rawHash}/detail.webp`, publicBytes],
    [`bench/objects/${sharedHash}.png`, sharedBytes],
  ])
  return { rawHash, publicHash, sharedHash, releaseHash, release, v2, run, samples, publicEvidence, bytes }
}

test('V1 retirement inventory binds the exact immutable release and preserves externally referenced objects', async () => {
  const item = fixture()
  const inventory = await buildV1RetirementInventory({
    expectedReleaseHash: item.releaseHash,
    releases: [item.release, item.v2],
    runs: [item.run, { _id: 'run-other', suiteId: 'other-suite', evaluationMode: 'other', evaluationEpoch: 'other' }],
    samples: item.samples,
    judgments: [{ _id: 'judgment-v1', runId: 'run-v1' }],
    dispatches: [{ _id: 'dispatch-v1', runId: 'run-v1' }],
    publicEvidence: item.publicEvidence,
    otherEvidence: [],
    readObject: async (objectKey) => item.bytes.get(objectKey)!,
  })

  assert.equal(inventory.releaseHash, item.releaseHash)
  assert.deepEqual(inventory.targetRunIds, ['run-v1'])
  assert.deepEqual(inventory.dbCounts, { releases: 1, runs: 1, samples: 2, judgments: 1, dispatches: 1, publicEvidence: 1 })
  assert.equal(inventory.objects.length, 3)
  assert.deepEqual(inventory.exclusiveObjects.map((entry) => entry.objectKey).sort(), [
    `bench/objects/${item.rawHash}.png`,
    `bench/public/evidence/${item.rawHash}/detail.webp`,
  ].sort())
  assert.deepEqual(inventory.sharedObjects.map((entry) => entry.objectKey), [`bench/objects/${item.sharedHash}.png`])
  assert.equal(inventory.exclusiveBytes, item.bytes.get(`bench/objects/${item.rawHash}.png`)!.length + item.bytes.get(`bench/public/evidence/${item.rawHash}/detail.webp`)!.length)
  assert.match(inventory.inventoryHash, /^[a-f0-9]{64}$/u)
})

test('V1 retirement rejects a release identity mismatch and object byte drift', async (t) => {
  const item = fixture()
  await t.test('identity mismatch', async () => {
    await assert.rejects(() => buildV1RetirementInventory({
      expectedReleaseHash: item.releaseHash,
      releases: [{ ...item.release, evaluationEpoch: 'wrong' }, item.v2], runs: [item.run], samples: item.samples.slice(0, 2), judgments: [], dispatches: [], publicEvidence: item.publicEvidence, otherEvidence: [],
      readObject: async (objectKey) => item.bytes.get(objectKey)!,
    }), /V1_RETIREMENT_RELEASE_INVALID/u)
  })
  await t.test('object drift', async () => {
    await assert.rejects(() => buildV1RetirementInventory({
      expectedReleaseHash: item.releaseHash,
      releases: [item.release, item.v2], runs: [item.run], samples: item.samples.slice(0, 2), judgments: [], dispatches: [], publicEvidence: item.publicEvidence, otherEvidence: [],
      readObject: async (objectKey) => objectKey.includes('/detail.webp') ? Buffer.from('tampered') : item.bytes.get(objectKey)!,
    }), /V1_RETIREMENT_OBJECT_HASH_MISMATCH/u)
  })
})

test('V1 object deletion requires the exact inventory hash and never deletes shared objects', async () => {
  const item = fixture()
  const inventory = await buildV1RetirementInventory({
    expectedReleaseHash: item.releaseHash, releases: [item.release, item.v2], runs: [item.run, { _id: 'run-other' }], samples: item.samples,
    judgments: [], dispatches: [], publicEvidence: item.publicEvidence, otherEvidence: [], readObject: async (objectKey) => item.bytes.get(objectKey)!,
  })
  const deleted: string[] = []
  await assert.rejects(() => deleteExclusiveV1Objects(inventory, '0'.repeat(64), { deleteObject: async () => {} }), /V1_RETIREMENT_INVENTORY_HASH_MISMATCH/u)
  const receipt = await deleteExclusiveV1Objects(inventory, inventory.inventoryHash, { deleteObject: async (objectKey) => { deleted.push(objectKey) } })
  assert.deepEqual(deleted.sort(), inventory.exclusiveObjects.map((entry) => entry.objectKey).sort())
  assert.equal(deleted.includes(`bench/objects/${item.sharedHash}.png`), false)
  assert.equal(receipt.deletedObjectCount, 2)
  assert.equal(receipt.deletedBytes, inventory.exclusiveBytes)
})

test('V1 object deletion completes the capability preflight before touching any real object', async () => {
  const item = fixture()
  const inventory = await buildV1RetirementInventory({
    expectedReleaseHash: item.releaseHash, releases: [item.release, item.v2], runs: [item.run, { _id: 'run-other' }], samples: item.samples,
    judgments: [], dispatches: [], publicEvidence: item.publicEvidence, otherEvidence: [], readObject: async (objectKey) => item.bytes.get(objectKey)!,
  })
  const deleted: string[] = []
  await assert.rejects(() => deleteExclusiveV1Objects(inventory, inventory.inventoryHash, {
    preflight: async () => { throw new Error('DELETE_CAPABILITY_DENIED') },
    deleteObject: async (objectKey) => { deleted.push(objectKey) },
  }), /DELETE_CAPABILITY_DENIED/u)
  assert.deepEqual(deleted, [])
})
