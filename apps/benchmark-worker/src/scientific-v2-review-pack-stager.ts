import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { canonicalHash, createScientificReviewPacket } from '@paperbanana/benchmark-core'

import type { ScientificV2BatchManifest, ScientificV2BatchState } from './scientific-v2-manifest.js'
import {
  createScientificReviewSourceBindings,
  normalizeScientificReviewTargetModelIds,
} from './scientific-v2-review.js'

type ReviewPackStagingInput = {
  manifest: ScientificV2BatchManifest
  state: ScientificV2BatchState
  attestationSecret: string
  issuedAt: string
  targetModelIds?: string[]
}

export function createScientificV2ReviewPackStagingBundle(input: ReviewPackStagingInput) {
  const { manifest, state, attestationSecret, issuedAt } = input
  const targetModelIds = normalizeScientificReviewTargetModelIds(input.targetModelIds, manifest)
  const targetSet = targetModelIds ? new Set(targetModelIds) : null
  if (state.status !== 'completed' || state.manifestHash !== manifest.manifestHash) {
    throw new Error('SCIENTIFIC_V2_REVIEW_BATCH_NOT_TERMINAL')
  }
  const cases = new Map(manifest.cases.map((item) => [item.id, item]))
  const sources = manifest.models.filter((model) => !targetSet || targetSet.has(model.canonicalModelId)).map((model) => {
    const modelKey = model.canonicalModelId
    const slots = state.slots.filter((slot) => slot.canonicalModelId === modelKey && slot.status === 'succeeded')
    if (slots.length === 0) return { modelKey, packet: null, signingSecret: null }
    const runHash = canonicalHash({
      batchManifestHash: manifest.manifestHash,
      stateHash: state.stateHash,
      modelKey,
      attemptHashes: slots.map((slot) => slot.attempts.at(-1)!.attemptHash),
    })
    const items = slots.map((slot) => {
      const scientificCase = cases.get(slot.caseId)
      const attempt = slot.attempts.at(-1)
      if (!scientificCase || !attempt?.rawImageHash) throw new Error('SCIENTIFIC_V2_REVIEW_SOURCE_INVALID')
      const common = {
        caseId: scientificCase.id,
        caseManifestHash: scientificCase.manifestHash,
        applicableAxes: scientificCase.applicableAxes,
        imageHash: attempt.rawImageHash,
        rubric: scientificCase.rubric,
        attemptResult: {
          status: 'succeeded' as const,
          routeId: `${slot.provider}:${slot.modelId}:${slot.operation}`,
          attemptHash: attempt.attemptHash,
        },
        instruction: scientificCase.instruction,
      }
      return scientificCase.kind === 'generation'
        ? { ...common, negativePrompt: scientificCase.negativePrompt, aspectRatio: scientificCase.aspectRatio }
        : {
            ...common,
            sourceHash: scientificCase.sourceHash,
            editedHash: attempt.editedHash,
            region: scientificCase.region,
          }
    })
    const packet = createScientificReviewPacket({
      suiteManifestHash: manifest.suiteHash,
      packetId: `scientific-v2:${manifest.manifestHash}:${modelKey}`,
      runHash,
      issuedAt,
      signingSecret: attestationSecret,
      items,
    })
    return { modelKey, packet, signingSecret: attestationSecret }
  })
  const bound = createScientificReviewSourceBindings({
    batchManifestHash: manifest.manifestHash,
    manifest,
    state,
    sources,
    ...(targetModelIds ? { targetModelIds } : {}),
  }, attestationSecret)
  const bindingByModel = new Map(bound.bindings.map((binding) => [binding.modelKey, binding]))
  const boundSources = sources.map((source) => {
    const binding = bindingByModel.get(source.modelKey)
    if (!binding) throw new Error('SCIENTIFIC_V2_REVIEW_SOURCE_BINDING_INVALID')
    return { ...source, binding }
  })
  return {
    operation: 'review_pack' as const,
    gate: { enabled: false as const, concurrency: 1 as const, lockName: '/run/lock/paperbanana-hk-production.lock' as const },
    input: {
      batchManifestHash: manifest.manifestHash,
      manifest,
      state,
      sourceSetHash: bound.sourceSetHash,
      seed: canonicalHash({ batchManifestHash: manifest.manifestHash, stateHash: state.stateHash, reviewProtocol: manifest.reviewProtocol }),
      sources: boundSources,
      ...(targetModelIds ? { targetModelIds } : {}),
      attestationSecret,
    },
  }
}

function main() {
  const inputPath = '/run/paperbanana-review-input/input.json'
  const outputPath = '/run/paperbanana-review-output/bundle.json'
  const input = JSON.parse(readFileSync(inputPath, 'utf8')) as ReviewPackStagingInput
  const bundle = createScientificV2ReviewPackStagingBundle(input)
  writeFileSync(outputPath, `${JSON.stringify(bundle)}\n`, { encoding: 'utf8', mode: 0o600, flag: 'wx' })
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    main()
  } catch (error) {
    const message = String((error as Error)?.message || error)
    process.stderr.write(`${/^SCIENTIFIC_V2_[A-Z0-9_]+$/.test(message) ? message : 'SCIENTIFIC_V2_REVIEW_PACK_STAGER_FAILED'}\n`)
    process.exitCode = 1
  }
}
