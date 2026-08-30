import assert from 'node:assert/strict'
import test from 'node:test'

import {
  PB_SCIENTIFIC_FIGURE_V2,
  createScientificReviewPacket,
  verifyScientificReviewPacket,
} from '../src/index.js'

const generationCase = PB_SCIENTIFIC_FIGURE_V2.cases[0]

function createPacket(signingSecret: string) {
  return createScientificReviewPacket({
    suiteManifestHash: PB_SCIENTIFIC_FIGURE_V2.manifestHash,
    packetId: 'secret-boundary-packet',
    runHash: 'a'.repeat(64),
    issuedAt: '2026-09-04T00:00:00.000Z',
    signingSecret,
    items: [{
      caseId: generationCase.id,
      caseManifestHash: generationCase.manifestHash,
      applicableAxes: generationCase.applicableAxes,
      imageHash: 'b'.repeat(64),
      rubric: generationCase.rubric,
      instruction: generationCase.instruction,
      negativePrompt: generationCase.negativePrompt,
      aspectRatio: generationCase.aspectRatio,
      attemptResult: { status: 'succeeded', routeId: 'ark:model', attemptHash: 'c'.repeat(64) },
    }],
  })
}

test('review signing secrets require at least 32 UTF-8 bytes in creator and verifier', () => {
  const ascii31 = 's'.repeat(31)
  const ascii32 = 's'.repeat(32)
  assert.equal(Buffer.byteLength(ascii31, 'utf8'), 31)
  assert.equal(Buffer.byteLength(ascii32, 'utf8'), 32)
  assert.throws(() => createPacket(ascii31), /SCIENTIFIC_REVIEW_PACKET_SCHEMA_MISMATCH/)
  const packet = createPacket(ascii32)
  assert.throws(() => verifyScientificReviewPacket(packet, ascii31), /SCIENTIFIC_REVIEW_PACKET_SCHEMA_MISMATCH/)
  assert.doesNotThrow(() => verifyScientificReviewPacket(packet, ascii32))
})

test('multi-byte signing secrets use encoded byte length rather than JavaScript character count', () => {
  const utf8Bytes31 = `${'密'.repeat(10)}a`
  const utf8Bytes32 = `${'密'.repeat(10)}ab`
  assert.equal(utf8Bytes31.length, 11)
  assert.equal(utf8Bytes32.length, 12)
  assert.equal(Buffer.byteLength(utf8Bytes31, 'utf8'), 31)
  assert.equal(Buffer.byteLength(utf8Bytes32, 'utf8'), 32)
  assert.throws(() => createPacket(utf8Bytes31), /SCIENTIFIC_REVIEW_PACKET_SCHEMA_MISMATCH/)
  const packet = createPacket(utf8Bytes32)
  assert.throws(() => verifyScientificReviewPacket(packet, utf8Bytes31), /SCIENTIFIC_REVIEW_PACKET_SCHEMA_MISMATCH/)
  assert.doesNotThrow(() => verifyScientificReviewPacket(packet, utf8Bytes32))
})
