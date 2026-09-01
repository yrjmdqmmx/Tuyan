import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  PB_SCIENTIFIC_FIGURE_V2,
  SCIENTIFIC_BENCHMARK_IDENTITY,
  buildScientificV2CanonicalManifest,
  buildScientificV2PriceSnapshot,
  canonicalHash,
  deriveScientificV2PriceRequirements,
} from '@paperbanana/benchmark-core'

import { createMongoBenchmarkRepository } from '../src/benchmark-repository.js'
import { createBenchmarkService } from '../src/benchmark-service.js'
import {
  buildScientificV2RemediationFreeze,
  createScientificV2MongoRepository,
  normalizeScientificV2SignedStateOperationReport,
  normalizeScientificV2StateOperationReport,
  scientificV2StateOperationReportHmacPayload,
  verifyScientificV2ImportedState,
} from '../src/scientific-v2-repository.js'
import {
  verifyScientificV2BatchManifest as verifyWorkerScientificV2BatchManifest,
  verifyScientificV2BatchState as verifyWorkerScientificV2BatchState,
} from '../../benchmark-worker/src/scientific-v2-manifest.js'

const FIXED_NOW = new Date('2026-08-31T00:00:00.000Z')

function scientificBatchFixture(options: { directEdit?: boolean; secondBailianModel?: boolean; splitCanonicalAcrossProviders?: boolean } = {}) {
  const directEdit = options.directEdit !== false
  const sharedCanonicalModelId = 'alibaba:shared-route-model'
  const primaryLabel = options.splitCanonicalAcrossProviders ? 'Shared Route Model' : 'Qwen Image 3 Pro'
  const registry = {
      providers: {
        bailian: {
          models: [{
            id: 'qwen-image-3.0-pro', label: primaryLabel, vendor: 'Alibaba', selectable: true,
            ...(options.splitCanonicalAcrossProviders ? { canonicalModelId: sharedCanonicalModelId } : {}),
            roles: ['image'], capabilities: { imageGeneration: true, imageEditMode: options.splitCanonicalAcrossProviders ? 'none' as const : directEdit ? 'direct-edit' as const : 'none' as const, resolutions: ['2K'] },
          }, ...(options.secondBailianModel ? [{
            id: 'wanx-image-1.0-pro', label: 'Wanx Image 1 Pro', vendor: 'Alibaba', selectable: true,
            roles: ['image'], capabilities: { imageGeneration: true, imageEditMode: directEdit ? 'direct-edit' as const : 'none' as const, resolutions: ['2K'] },
          }] : [])],
        },
        ...(options.splitCanonicalAcrossProviders ? { openrouter: { models: [{
          id: 'alibaba/shared-route-model', canonicalModelId: sharedCanonicalModelId,
          label: primaryLabel, vendor: 'Alibaba', selectable: true, roles: ['image'],
          capabilities: { imageGeneration: true, imageEditMode: 'direct-edit' as const, resolutions: ['2K'] },
        }] } } : {}),
      },
    }
  const registrySnapshotBase = {
    registryVersion: '2026-08-31.scientific-v2-test',
    registryHash: canonicalHash(registry),
    registry,
  }
  const registrySnapshot = { ...registrySnapshotBase, snapshotHash: canonicalHash(registrySnapshotBase) }
  const canonicalManifest = buildScientificV2CanonicalManifest(registrySnapshotBase)
  const priceSnapshot = buildScientificV2PriceSnapshot({
    canonicalManifest, capturedAt: FIXED_NOW.toISOString(),
    observations: deriveScientificV2PriceRequirements(canonicalManifest).map((requirement, index) => {
      const source = { url: `https://example.com/${requirement.provider}/${requirement.operation}`, mediaType: 'application/json', capturedAt: FIXED_NOW.toISOString(), bytesSha256: 'a'.repeat(64) }
      const common = {
        provider: requirement.provider, modelId: requirement.modelId, operation: requirement.operation, imageSize: requirement.imageSize,
        billingRegion: requirement.provider === 'openrouter' ? 'openrouter-global' : 'cn-beijing', outputWidth: 2048, outputHeight: 1152,
      }
      if (requirement.provider !== 'openrouter') return {
        ...common,
        charges: [{ billable: 'output_image' as const, unit: 'image' as const, rateDecimal: '1', quantityDecimal: '1', resolutionTier: requirement.imageSize }],
        source, openRouterEvidence: null, fxEvidence: null,
      }
      const pricing = [
        { billable: 'output_image' as const, unit: 'image' as const, costUsd: '1', variant: requirement.imageSize },
        ...(requirement.operation === 'edit' ? [{ billable: 'input_reference' as const, unit: 'image' as const, costUsd: '0', variant: null }] : []),
      ]
      return {
        ...common,
        charges: pricing.map((line) => ({ billable: line.billable, unit: line.unit, rateDecimal: line.costUsd, quantityDecimal: '1', resolutionTier: line.variant })),
        source,
        openRouterEvidence: {
          modelApi: { ...source, url: 'https://openrouter.ai/api/v1/images/models', bytesSha256: 'b'.repeat(64) },
          endpointApi: source, pricingPage: null, modelId: requirement.modelId, providerSlug: `fixture-${index}`, rawPricing: pricing, tokenBounds: null,
        },
        fxEvidence: {
          source: { ...source, url: 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml', mediaType: 'application/xml', bytesSha256: 'c'.repeat(64) },
          rateDate: '2026-08-31', baseCurrency: 'EUR' as const, usdPerBaseDecimal: '1', cnyPerBaseDecimal: '1',
        },
      }
    }),
  })
  const models = structuredClone(canonicalManifest.models)
  const cases = structuredClone([...PB_SCIENTIFIC_FIGURE_V2.cases])
  const priority: Record<string, number> = { bailian: 0, ark: 1, openrouter: 2, codex: 3 }
  const executionOrder = models.flatMap((model: any) => cases.map((scientificCase: any) => {
    const route = scientificCase.kind === 'generation' ? model.generationRoute : model.editRoute
    const supported = scientificCase.kind === 'generation' || Boolean(route)
    return {
      sequence: 0,
      slotId: `${model.canonicalModelId}:${scientificCase.id}`,
      canonicalModelId: model.canonicalModelId,
      caseId: scientificCase.id,
      provider: route?.provider ?? null,
      modelId: route?.modelId ?? null,
      operation: scientificCase.kind,
      imageSize: supported ? '2K' : null,
      supported,
      isProviderCanary: false,
      routeStatus: supported ? 'frozen_route' : 'no_direct_edit_route',
    }
  })).sort((left: any, right: any) => (left.provider === null ? 4 : priority[left.provider]) - (right.provider === null ? 4 : priority[right.provider])
    || Buffer.compare(Buffer.from(left.canonicalModelId), Buffer.from(right.canonicalModelId))
    || cases.findIndex((item: any) => item.id === left.caseId) - cases.findIndex((item: any) => item.id === right.caseId))
  const canaries = new Set<string>()
  executionOrder.forEach((slot: any, index: number) => {
    slot.sequence = index + 1
    if (slot.provider && slot.provider !== 'codex' && !canaries.has(slot.provider)) {
      slot.isProviderCanary = true
      canaries.add(slot.provider)
    }
  })
  const manifestBase = {
    schemaVersion: 2 as const,
    ...SCIENTIFIC_BENCHMARK_IDENTITY,
    codeSha: 'a'.repeat(40),
    registryVersion: canonicalManifest.registryVersion,
    registryHash: canonicalManifest.registryHash,
    registrySnapshotHash: registrySnapshot.snapshotHash,
    registrySnapshot,
    canonicalManifestHash: canonicalManifest.manifestHash,
    suiteHash: PB_SCIENTIFIC_FIGURE_V2.manifestHash,
    priceHash: priceSnapshot.snapshotHash,
    priceOperatorAuthorizationHash: priceSnapshot.operatorAuthorizationHash,
    canonicalManifest,
    models,
    cases,
    executionOrder,
    providerOrder: ['bailian', 'ark', 'openrouter'],
    providerBudgetsCny: { bailian: 180, ark: 180, openrouter: 360 },
    codexLimits: { modelId: 'codex:gpt-image-2', successfulSlots: 9, maxAttemptsPerSlot: 4, maxToolCalls: 36 },
    concurrency: 1,
    lockName: '/run/lock/paperbanana-hk-production.lock',
    priceSnapshot,
    createdAt: FIXED_NOW.toISOString(),
  }
  const manifest = { ...manifestBase, manifestHash: canonicalHash(manifestBase) }
  const stateBase = {
    schemaVersion: 2,
    manifestHash: manifest.manifestHash,
    status: 'ready',
    pauseReason: null,
    blockReason: null,
    createdAt: FIXED_NOW.toISOString(),
    updatedAt: FIXED_NOW.toISOString(),
    providerSpentCny: { bailian: 0, ark: 0, openrouter: 0 },
    providerUnreconciledCny: { bailian: 0, ark: 0, openrouter: 0 },
    slots: executionOrder.map((slot: any) => ({ ...slot, status: 'pending', costCny: null, attempts: [] })),
  }
  const initialState = { ...stateBase, stateHash: canonicalHash(stateBase) }
  return { registrySnapshot, canonicalManifest, manifest, initialState }
}

function scientificDb() {
  const rows = new Map<string, any[]>()
  const collection = (name: string) => {
    if (!rows.has(name)) rows.set(name, [])
    const documents = rows.get(name)!
    return {
      async findOne(query: Record<string, unknown>) {
        return documents.find((row) => Object.entries(query).every(([key, value]) => row[key] === value)) || null
      },
      async insertOne(document: any) {
        documents.push(structuredClone(document))
        return { acknowledged: true, insertedId: document._id }
      },
      async createIndex() { return 'index' },
    }
  }
  return { db: { collection } as any, rows }
}

function getPath(value: any, path: string) {
  return path.split('.').reduce((current, key) => current?.[key], value)
}

function matches(row: any, query: Record<string, any>): boolean {
  return Object.entries(query).every(([key, expected]): boolean => {
    const actual = getPath(row, key)
    if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
      if ('$exists' in expected) return (actual !== undefined) === expected.$exists
      if ('$in' in expected) return expected.$in.includes(actual)
      if ('$elemMatch' in expected) return Array.isArray(actual) && actual.some((item): boolean => matches(item, expected.$elemMatch))
      if ('$lte' in expected) return actual <= expected.$lte
      if ('$gt' in expected) return actual > expected.$gt
    }
    return actual === expected
  })
}

function setPath(value: any, path: string, next: any) {
  const keys = path.split('.')
  const leaf = keys.pop()!
  const target = keys.reduce((current, key) => current[key] ||= {}, value)
  target[leaf] = structuredClone(next)
}

function atomicScientificDb() {
  const rows = new Map<string, any[]>()
  let failDispatchUpdate = false
  let throwAfterCommit = false
  let failPublishBatchCas = false
  let failArbitrationBatchCas = false
  let failStateAttachmentBatchCas = false
  let failReviewFinalBatchCas = false
  let beforeDispatchReservation: null | (() => void | Promise<void>) = null
  const collection = (name: string) => {
    if (!rows.has(name)) rows.set(name, [])
    const documents = rows.get(name)!
    return {
      async findOne(query: Record<string, any>) {
        const found = documents.find((row) => matches(row, query))
        return found ? structuredClone(found) : null
      },
      find(query: Record<string, any>) {
        let selected = documents.filter((row) => matches(row, query)).map((row) => structuredClone(row))
        const cursor: any = {
          sort(spec: Record<string, number>) {
            selected.sort((left, right) => {
              for (const [path, direction] of Object.entries(spec)) {
                const leftValue = getPath(left, path)
                const rightValue = getPath(right, path)
                if (leftValue < rightValue) return -direction
                if (leftValue > rightValue) return direction
              }
              return 0
            })
            return cursor
          },
          skip(offset: number) { selected = selected.slice(offset); return cursor },
          limit(limit: number) { selected = selected.slice(0, limit); return cursor },
          async next() { return selected[0] || null },
          async toArray() { return structuredClone(selected) },
        }
        return cursor
      },
      async findOneAndUpdate(query: Record<string, any>, update: any) {
        const found = documents.find((row) => matches(row, query))
        if (!found) return null
        for (const [path, value] of Object.entries(update.$set || {})) setPath(found, path, value)
        for (const path of Object.keys(update.$unset || {})) setPath(found, path, undefined)
        return structuredClone(found)
      },
      async updateOne(query: Record<string, any>, update: any) {
        if (name === 'paperbanana_benchmark_scientific_v2_dispatches' && failDispatchUpdate) throw new Error('SIMULATED_DISPATCH_UPDATE_FAILURE')
        if (name === 'paperbanana_benchmark_scientific_v2_batches' && failPublishBatchCas && query.status === 'review_finalized') return { matchedCount: 0, modifiedCount: 0 }
        if (name === 'paperbanana_benchmark_scientific_v2_batches' && failArbitrationBatchCas && query.status === 'review_dispute') return { matchedCount: 0, modifiedCount: 0 }
        if (name === 'paperbanana_benchmark_scientific_v2_batches' && failStateAttachmentBatchCas && query.stateTransitionFromHash !== undefined) return { matchedCount: 0, modifiedCount: 0 }
        if (name === 'paperbanana_benchmark_scientific_v2_batches' && failReviewFinalBatchCas
          && ['review_finalized', 'review_dispute'].includes(update.$set?.status)) return { matchedCount: 0, modifiedCount: 0 }
        if (name === 'paperbanana_benchmark_scientific_v2_batches' && update.$set?.activeDispatchId && beforeDispatchReservation) {
          const hook = beforeDispatchReservation
          beforeDispatchReservation = null
          await hook()
        }
        const found = documents.find((row) => matches(row, query))
        if (!found) return { matchedCount: 0, modifiedCount: 0 }
        for (const [path, value] of Object.entries(update.$set || {})) setPath(found, path, value)
        for (const path of Object.keys(update.$unset || {})) setPath(found, path, undefined)
        return { matchedCount: 1, modifiedCount: 1 }
      },
      async insertOne(document: any) {
        if (documents.some((row) => row._id === document._id)) {
          const error = new Error('duplicate key') as Error & { code: number }
          error.code = 11000
          throw error
        }
        documents.push(structuredClone(document))
        return { acknowledged: true, insertedId: document._id }
      },
      async createIndex() { return 'index' },
    }
  }
  const client = {
    startSession() {
      return {
        async withTransaction(operation: () => Promise<void>) {
          const snapshot = structuredClone([...rows.entries()])
          try { await operation() }
          catch (error) {
            const snapshotByName = new Map(snapshot)
            for (const [name, documents] of rows) documents.splice(0, documents.length, ...structuredClone(snapshotByName.get(name) || []))
            for (const [name, documents] of snapshot) if (!rows.has(name)) rows.set(name, structuredClone(documents))
            throw error
          }
          if (throwAfterCommit) {
            throwAfterCommit = false
            throw new Error('SIMULATED_ACK_LOSS')
          }
        },
        async endSession() {},
      }
    },
  }
  return {
    db: { collection, client } as any,
    rows,
    failNextDispatchUpdate() { failDispatchUpdate = true },
    clearDispatchFailure() { failDispatchUpdate = false },
    loseNextCommitAck() { throwAfterCommit = true },
    failNextPublishBatchCas() { failPublishBatchCas = true },
    failNextArbitrationBatchCas() { failArbitrationBatchCas = true },
    failNextStateAttachmentBatchCas() { failStateAttachmentBatchCas = true },
    clearArbitrationBatchFailure() { failArbitrationBatchCas = false },
    failNextReviewFinalBatchCas() { failReviewFinalBatchCas = true },
    clearReviewFinalBatchFailure() { failReviewFinalBatchCas = false },
    beforeNextDispatchReservation(hook: () => void | Promise<void>) { beforeDispatchReservation = hook },
  }
}

function refreshState(state: any, updatedAt = '2026-08-31T00:00:01.000Z') {
  const next = structuredClone(state)
  next.updatedAt = updatedAt
  delete next.stateHash
  next.stateHash = canonicalHash(next)
  return next
}

function rehashFreezeFixture(value: ReturnType<typeof scientificBatchFixture>) {
  const fixture = structuredClone(value) as ReturnType<typeof scientificBatchFixture>
  const registryBase = structuredClone(fixture.registrySnapshot) as any
  delete registryBase.snapshotHash
  fixture.registrySnapshot.snapshotHash = canonicalHash(registryBase)
  fixture.manifest.registrySnapshot = structuredClone(fixture.registrySnapshot)
  fixture.manifest.registrySnapshotHash = fixture.registrySnapshot.snapshotHash
  const priceBase = structuredClone(fixture.manifest.priceSnapshot) as any
  delete priceBase.snapshotHash
  fixture.manifest.priceSnapshot.snapshotHash = canonicalHash(priceBase)
  fixture.manifest.priceHash = fixture.manifest.priceSnapshot.snapshotHash
  const manifestBase = structuredClone(fixture.manifest) as any
  delete manifestBase.manifestHash
  fixture.manifest.manifestHash = canonicalHash(manifestBase)
  fixture.initialState.manifestHash = fixture.manifest.manifestHash
  const stateBase = structuredClone(fixture.initialState) as any
  delete stateBase.stateHash
  fixture.initialState.stateHash = canonicalHash(stateBase)
  return fixture
}

function failProviderCanary(state: any) {
  const next = structuredClone(state)
  const slot = next.slots.find((candidate: any) => candidate.isProviderCanary)!
  const original = slot.attempts[0]
  slot.attempts = Array.from({ length: 4 }, (_, index) => {
    const base = {
      ...original, attemptIndex: index + 1, responseClass: 'confirmed_provider_failure', actualCny: null,
      startedAt: `2026-08-31T00:00:0${index + 1}.000Z`, completedAt: `2026-08-31T00:00:0${index + 2}.000Z`,
      rawImageHash: null, byteSize: null, width: null, height: null, format: null, editedHash: null,
    }
    delete base.attemptHash
    return { ...base, attemptHash: canonicalHash(base) }
  })
  slot.status = 'failed'
  next.providerSpentCny[slot.provider] += 3
  slot.costCny = 4
  return refreshState(next, '2026-08-31T00:00:09.000Z')
}

function propagatedProviderCanaryFailureState(fixture: ReturnType<typeof scientificBatchFixture>) {
  const state = failProviderCanary(completedScientificState(fixture))
  const canary = state.slots.find((slot: any) => slot.isProviderCanary && slot.status === 'failed')!
  for (const slot of state.slots) {
    if (slot.provider !== canary.provider || slot.canonicalModelId !== canary.canonicalModelId || slot.slotId === canary.slotId) continue
    slot.status = 'failed'
    slot.costCny = 0
    slot.attempts = []
  }
  state.providerSpentCny[canary.provider] = state.slots
    .filter((slot: any) => slot.provider === canary.provider)
    .reduce((total: number, slot: any) => total + Number(slot.costCny || 0), 0)
  return refreshState(state, '2026-08-31T00:00:10.000Z')
}

function blockedProviderCanaryState(fixture: ReturnType<typeof scientificBatchFixture>) {
  const state = structuredClone(fixture.initialState) as any
  const slot = state.slots.find((candidate: any) => candidate.isProviderCanary)!
  const scientificCase = fixture.manifest.cases.find((candidate: any) => candidate.id === slot.caseId)!
  slot.attempts = Array.from({ length: 4 }, (_, index) => {
    const attemptBase = {
      attemptIndex: index + 1, provider: slot.provider, model: slot.modelId, operation: slot.operation,
      payloadHash: expectedSlotPayload(fixture, slot), responseClass: 'confirmed_provider_failure', estimatedCny: 1, actualCny: null,
      startedAt: `2026-08-31T00:00:0${index + 1}.000Z`, completedAt: `2026-08-31T00:00:0${index + 2}.000Z`,
      rawImageHash: null, byteSize: null, width: null, height: null, format: null,
      sourceHash: scientificCase.kind === 'edit' ? scientificCase.sourceHash : null, editedHash: null,
    }
    return { ...attemptBase, attemptHash: canonicalHash(attemptBase) }
  })
  slot.status = 'failed'
  slot.costCny = 4
  state.providerSpentCny[slot.provider] = 4
  for (const later of state.slots.slice(slot.sequence)) {
    later.status = 'not_executed'
    later.costCny = null
  }
  state.status = 'blocked'
  state.blockReason = 'provider_canary_failed'
  return refreshState(state, '2026-08-31T00:00:09.000Z')
}

function codexCanaryWithRetry(state: any) {
  const next = structuredClone(state)
  const slot = next.slots.find((candidate: any) => candidate.provider === 'codex')!
  const success = structuredClone(slot.attempts[0])
  const failureBase = {
    ...success, attemptIndex: 1, responseClass: 'confirmed_technical_failure', actualCny: 0,
    rawImageHash: null, byteSize: null, width: null, height: null, format: null, editedHash: null,
  }
  delete failureBase.attemptHash
  success.attemptIndex = 2
  success.startedAt = '2026-08-31T00:00:03.000Z'
  success.completedAt = '2026-08-31T00:00:04.000Z'
  delete success.attemptHash
  slot.attempts = [
    { ...failureBase, attemptHash: canonicalHash(failureBase) },
    { ...success, attemptHash: canonicalHash(success) },
  ]
  slot.costCny = 0
  return refreshState(next, '2026-08-31T00:00:09.000Z')
}

function expectedSlotPayload(fixture: ReturnType<typeof scientificBatchFixture>, slot: any) {
  const scientificCase: any = fixture.manifest.cases.find((candidate: any) => candidate.id === slot.caseId)!
  return slot.provider === 'codex'
    ? canonicalHash({ manifestHash: fixture.manifest.manifestHash, slotId: slot.slotId, caseManifestHash: scientificCase.manifestHash })
    : canonicalHash({
        route: { provider: slot.provider, modelId: slot.modelId }, operation: slot.operation, imageSize: slot.imageSize,
        caseId: scientificCase.id, instruction: scientificCase.instruction,
        ...(scientificCase.kind === 'generation'
          ? { negativePrompt: scientificCase.negativePrompt, aspectRatio: scientificCase.aspectRatio }
          : { sourceHash: scientificCase.sourceHash, region: scientificCase.region }),
      })
}

function successfulTransition(fixture: ReturnType<typeof scientificBatchFixture>, state: any, slot: any) {
  const next = structuredClone(state)
  const nextSlot = next.slots.find((candidate: any) => candidate.slotId === slot.slotId)!
  const scientificCase: any = fixture.manifest.cases.find((candidate: any) => candidate.id === slot.caseId)!
  const imageHash = canonicalHash(`atomic-image:${slot.slotId}`)
  const attemptBase = {
    attemptIndex: 1, provider: slot.provider, model: slot.modelId, operation: slot.operation,
    payloadHash: expectedSlotPayload(fixture, slot), responseClass: 'succeeded', estimatedCny: 1, actualCny: 1,
    startedAt: '2026-08-31T00:00:01.000Z', completedAt: '2026-08-31T00:00:02.000Z',
    rawImageHash: imageHash, byteSize: 4096, width: 2048, height: 1152, format: 'png',
    sourceHash: scientificCase.kind === 'edit' ? scientificCase.sourceHash : null,
    editedHash: scientificCase.kind === 'edit' ? imageHash : null,
  }
  const attempt = { ...attemptBase, attemptHash: canonicalHash(attemptBase) }
  nextSlot.status = 'succeeded'
  nextSlot.costCny = 1
  nextSlot.attempts = [attempt]
  next.providerSpentCny[slot.provider] += 1
  return { attempt, nextState: refreshState(next, '2026-08-31T00:00:03.000Z') }
}

function completedScientificState(fixture: ReturnType<typeof scientificBatchFixture>) {
  const state = structuredClone(fixture.initialState) as any
  const spent = { bailian: 0, ark: 0, openrouter: 0 }
  for (const slot of state.slots) {
    const scientificCase = fixture.manifest.cases.find((candidate: any) => candidate.id === slot.caseId)!
    if (!slot.supported) {
      slot.status = 'unsupported'
      slot.costCny = 0
      continue
    }
    const payloadHash = slot.provider === 'codex'
      ? canonicalHash({ manifestHash: fixture.manifest.manifestHash, slotId: slot.slotId, caseManifestHash: scientificCase.manifestHash })
      : canonicalHash({
          route: { provider: slot.provider, modelId: slot.modelId }, operation: slot.operation, imageSize: slot.imageSize,
          caseId: scientificCase.id, instruction: scientificCase.instruction,
          ...(scientificCase.kind === 'generation'
            ? { negativePrompt: scientificCase.negativePrompt, aspectRatio: scientificCase.aspectRatio }
            : { sourceHash: scientificCase.sourceHash, region: scientificCase.region }),
        })
    const imageHash = canonicalHash(`image:${slot.slotId}`)
    const attemptBase = {
      attemptIndex: 1, provider: slot.provider, model: slot.modelId, operation: slot.operation, payloadHash,
      responseClass: 'succeeded', estimatedCny: slot.provider === 'codex' ? 0 : 1, actualCny: slot.provider === 'codex' ? 0 : 1,
      startedAt: '2026-08-31T00:00:01.000Z', completedAt: '2026-08-31T00:00:02.000Z',
      rawImageHash: imageHash, byteSize: 4096, width: 2048, height: 1152, format: 'png',
      sourceHash: scientificCase.kind === 'edit' ? scientificCase.sourceHash : null,
      editedHash: scientificCase.kind === 'edit' ? imageHash : null,
    }
    slot.attempts = [{ ...attemptBase, attemptHash: canonicalHash(attemptBase) }]
    slot.status = 'succeeded'
    slot.costCny = attemptBase.actualCny
    if (slot.provider !== 'codex') spent[slot.provider as keyof typeof spent] += attemptBase.actualCny
  }
  state.status = 'completed'
  state.providerSpentCny = spent
  state.providerUnreconciledCny = { bailian: 0, ark: 0, openrouter: 0 }
  return refreshState(state, '2026-08-31T00:00:03.000Z')
}

function completedStateWithAuditedUnknownFailures(fixture: ReturnType<typeof scientificBatchFixture>) {
  const state = completedScientificState(fixture)
  const slot = state.slots.find((candidate: any) => candidate.provider !== 'codex' && !candidate.isProviderCanary && candidate.supported)!
  const previousCost = slot.costCny
  const originalAttempt = slot.attempts[0]
  slot.attempts = Array.from({ length: 4 }, (_, index) => {
    const attemptBase = {
      ...originalAttempt, attemptIndex: index + 1, responseClass: 'confirmed_technical_failure', actualCny: null,
      startedAt: `2026-08-31T00:00:0${index + 1}.000Z`, completedAt: `2026-08-31T00:00:0${index + 2}.000Z`,
      rawImageHash: null, byteSize: null, width: null, height: null, format: null,
      sourceHash: slot.operation === 'edit' ? originalAttempt.sourceHash : null, editedHash: null,
    }
    delete (attemptBase as any).attemptHash
    return { ...attemptBase, attemptHash: canonicalHash(attemptBase) }
  })
  slot.status = 'failed'
  slot.costCny = 4
  state.providerSpentCny[slot.provider] += 4 - previousCost
  return { state: refreshState(state, '2026-08-31T00:00:05.000Z'), slotId: slot.slotId }
}

function replaceDispatchesWithAuditedUnknowns(storage: ReturnType<typeof atomicScientificDb>, fixture: ReturnType<typeof scientificBatchFixture>, state: any, slotId: string) {
  const markers = storage.rows.get('paperbanana_benchmark_scientific_v2_dispatches') || []
  const reviews = storage.rows.get('paperbanana_benchmark_scientific_v2_review_artifacts') || []
  const slot = state.slots.find((candidate: any) => candidate.slotId === slotId)!
  for (const reconciledAttempt of slot.attempts) {
    const marker = markers.find((candidate: any) => candidate.slotId === slotId && candidate.attemptIndex === reconciledAttempt.attemptIndex)!
    const { attemptHash: _attemptHash, ...originalBase } = structuredClone(reconciledAttempt)
    originalBase.responseClass = 'unknown_provider_outcome'
    const originalAttempt = { ...originalBase, attemptHash: canonicalHash(originalBase) }
    marker.status = 'unknown'
    marker.attempt = structuredClone(originalAttempt)
    delete marker.committedAt
    marker.resolvedAt = FIXED_NOW
    const previousStateHash = canonicalHash(`unknown-previous:${slotId}:${reconciledAttempt.attemptIndex}`)
    const auditBase = {
      schemaVersion: 1, kind: 'unknown_no_artifact_reconciliation', manifestHash: fixture.manifest.manifestHash,
      previousStateHash, stateHash: canonicalHash(`unknown-next:${slotId}:${reconciledAttempt.attemptIndex}`),
      slotId, sequence: slot.sequence, originalAttempt, reconciledAttempt: structuredClone(reconciledAttempt),
      evidence: {
        workflowRunId: 33000000000 + reconciledAttempt.attemptIndex, candidateCount: 0, spoolCandidateCount: 0,
        credentialStatus: 200, reconciledAt: `2026-08-31T00:00:1${reconciledAttempt.attemptIndex}.000Z`,
      },
    }
    reviews.push({
      _id: `scientific-v2-unknown-reconciliation:${fixture.manifest.manifestHash}:${previousStateHash}`,
      artifactType: 'unknown_reconciliation', batchManifestHash: fixture.manifest.manifestHash,
      sourceSetHash: previousStateHash, ...structuredClone(auditBase), auditHash: canonicalHash(auditBase), createdAt: FIXED_NOW,
    })
  }
}

function canaryCompleteScientificState(fixture: ReturnType<typeof scientificBatchFixture>) {
  let state = structuredClone(fixture.initialState) as any
  for (const slot of fixture.manifest.executionOrder.filter((candidate: any) => candidate.isProviderCanary)) {
    state = successfulTransition(fixture, state, slot).nextState
  }
  state.status = 'canary_complete'
  return refreshState(state, '2026-08-31T00:00:03.000Z')
}

function awaitingScientificState(fixture: ReturnType<typeof scientificBatchFixture>) {
  const state = completedScientificState(fixture)
  for (const slot of state.slots.filter((candidate: any) => candidate.provider === 'codex')) {
    slot.status = 'awaiting_artifact'
    slot.costCny = null
    slot.attempts = []
  }
  state.status = 'awaiting_artifacts'
  return refreshState(state, '2026-08-31T00:00:04.000Z')
}

function completedStateWithOneLaterCodexFailure(fixture: ReturnType<typeof scientificBatchFixture>) {
  const state = completedScientificState(fixture)
  const codexSlots = state.slots.filter((slot: any) => slot.provider === 'codex')
  const slot = codexSlots[1]
  const scientificCase = fixture.manifest.cases.find((candidate: any) => candidate.id === slot.caseId)!
  slot.attempts = Array.from({ length: 4 }, (_, index) => {
    const attemptBase = {
      attemptIndex: index + 1, provider: slot.provider, model: slot.modelId, operation: slot.operation,
      payloadHash: expectedSlotPayload(fixture, slot), responseClass: 'confirmed_provider_failure', estimatedCny: 0, actualCny: 0,
      startedAt: `2026-08-31T00:00:0${index + 1}.000Z`, completedAt: `2026-08-31T00:00:0${index + 2}.000Z`,
      rawImageHash: null, byteSize: null, width: null, height: null, format: null,
      sourceHash: scientificCase.kind === 'edit' ? scientificCase.sourceHash : null, editedHash: null,
    }
    return { ...attemptBase, attemptHash: canonicalHash(attemptBase) }
  })
  slot.status = 'failed'
  slot.costCny = 0
  return refreshState(state, '2026-08-31T00:00:09.000Z')
}

function interruptedState(fixture: ReturnType<typeof scientificBatchFixture>, kind: 'unknown' | 'blocked') {
  const state = structuredClone(fixture.initialState) as any
  const slot = state.slots[0]
  if (kind === 'unknown') {
    const attemptBase = {
      attemptIndex: 1, provider: slot.provider, model: slot.modelId, operation: slot.operation,
      payloadHash: expectedSlotPayload(fixture, slot), responseClass: 'unknown_provider_outcome', estimatedCny: 1, actualCny: null,
      startedAt: '2026-08-31T00:00:01.000Z', completedAt: '2026-08-31T00:00:02.000Z',
      rawImageHash: null, byteSize: null, width: null, height: null, format: null, sourceHash: null, editedHash: null,
    }
    slot.attempts = [{ ...attemptBase, attemptHash: canonicalHash(attemptBase) }]
    slot.status = 'unknown'
    slot.costCny = 1
    state.status = 'paused'
    state.pauseReason = 'reconciliation_required'
    state.providerSpentCny[slot.provider] = 1
  } else {
    slot.status = 'budget_blocked'
    state.status = 'blocked'
    state.blockReason = 'provider_budget_exceeded_before_attempt'
  }
  return refreshState(state, '2026-08-31T00:00:03.000Z')
}

function invalidPriceReconciliationState(fixture: ReturnType<typeof scientificBatchFixture>) {
  const state = structuredClone(fixture.initialState) as any
  const slot = state.slots[0]
  const attemptBase = {
    attemptIndex: 1, provider: slot.provider, model: slot.modelId, operation: slot.operation,
    payloadHash: expectedSlotPayload(fixture, slot), responseClass: 'price_reconciliation_required', estimatedCny: 1, actualCny: 1,
    startedAt: '2026-08-31T00:00:01.000Z', completedAt: '2026-08-31T00:00:02.000Z',
    rawImageHash: null, byteSize: null, width: null, height: null, format: null, sourceHash: null, editedHash: null,
  }
  slot.attempts = [{ ...attemptBase, attemptHash: canonicalHash(attemptBase) }]
  slot.status = 'price_reconciliation'
  slot.costCny = 0
  for (const later of state.slots.slice(1)) {
    later.status = 'not_executed'
    later.costCny = null
  }
  state.status = 'paused'
  state.pauseReason = 'price_reconciliation_required'
  state.providerUnreconciledCny[slot.provider] = 1
  return refreshState(state, '2026-08-31T00:00:03.000Z')
}

function artifactReconciliationState(fixture: ReturnType<typeof scientificBatchFixture>, slotIndex = 0) {
  const state = structuredClone(fixture.initialState) as any
  const slot = state.slots[slotIndex]
  const imageHash = canonicalHash(`artifact-reconciliation:${slot.slotId}`)
  const attemptBase = {
    attemptIndex: 1, provider: slot.provider, model: slot.modelId, operation: slot.operation,
    payloadHash: expectedSlotPayload(fixture, slot), responseClass: 'artifact_reconciliation_required',
    estimatedCny: 1, actualCny: 1,
    startedAt: '2026-08-31T00:00:01.000Z', completedAt: '2026-08-31T00:00:02.000Z',
    rawImageHash: imageHash, byteSize: 4096, width: 2048, height: 1152, format: 'png',
    sourceHash: null, editedHash: null,
  }
  slot.status = 'artifact_reconciliation'
  slot.costCny = 1
  slot.attempts = [{ ...attemptBase, attemptHash: canonicalHash(attemptBase) }]
  for (const later of state.slots.slice(slotIndex + 1)) later.status = 'not_executed'
  state.status = 'paused'
  state.pauseReason = 'artifact_reconciliation_required'
  state.providerSpentCny[slot.provider] = 1
  return refreshState(state, '2026-08-31T00:00:03.000Z')
}

function recoveredArtifactState(fixture: ReturnType<typeof scientificBatchFixture>, paused = artifactReconciliationState(fixture)) {
  const state = structuredClone(paused) as any
  const slot = state.slots.find((candidate: any) => candidate.status === 'artifact_reconciliation')!
  const attempt = slot.attempts.at(-1)
  attempt.responseClass = 'succeeded'
  delete attempt.attemptHash
  attempt.attemptHash = canonicalHash(attempt)
  slot.status = 'succeeded'
  for (const later of state.slots) if (later.sequence > slot.sequence && later.status === 'not_executed') later.status = 'pending'
  state.status = 'running'
  state.pauseReason = null
  state.blockReason = null
  return refreshState(state, '2026-08-31T00:00:04.000Z')
}

function signedStateReport(secret: string, fixture: ReturnType<typeof scientificBatchFixture>, state: any, kind: 'worker' | 'codex' = 'codex', options: {
  batchId?: string
  previousStateHash?: string
  revision?: number
  providerCanaryPassed?: boolean
  manifestCodeSha?: string
  executionCodeSha?: string
  legacyRecoveryStateHash?: string | null
} = {}) {
  const codexSlots = state.slots.filter((slot: any) => slot.provider === 'codex')
  const reportPayload = {
    schemaVersion: 2 as const,
    identity: { ...SCIENTIFIC_BENCHMARK_IDENTITY },
    kind,
    batchId: options.batchId || 'scientific-v2-batch-import',
    batchManifestHash: fixture.manifest.manifestHash,
    revision: options.revision || 1,
    previousStateHash: options.previousStateHash || fixture.initialState.stateHash,
    stateHash: state.stateHash,
    state,
    manifestCodeSha: options.manifestCodeSha ?? fixture.manifest.codeSha,
    executionCodeSha: options.executionCodeSha ?? fixture.manifest.codeSha,
    legacyRecoveryStateHash: options.legacyRecoveryStateHash ?? null,
    providerCanaryAttestation: {
      providers: [...new Set(fixture.manifest.executionOrder.filter((slot: any) => slot.isProviderCanary).map((slot: any) => slot.provider))],
      passed: options.providerCanaryPassed ?? state.slots.filter((slot: any) => slot.isProviderCanary)
        .every((slot: any) => slot.status === 'succeeded' && ['succeeded', 'succeeded_low_quality'].includes(slot.attempts.at(-1)?.responseClass)),
      attemptSetHash: canonicalHash(state.slots.filter((slot: any) => slot.provider !== 'codex').flatMap((slot: any) => slot.attempts.map((attempt: any) => attempt.attemptHash))),
    },
    executionOrderAttestation: { slotIds: state.slots.map((slot: any) => slot.slotId), passed: true },
    codexProvenance: kind === 'codex' ? {
      modelId: 'codex:gpt-image-2',
      successfulSlots: codexSlots.filter((slot: any) => slot.status === 'succeeded').length,
      toolCalls: codexSlots.reduce((sum: number, slot: any) => sum + slot.attempts.length, 0),
      firstCaseId: codexSlots[0]?.caseId,
      artifactCanaryHash: codexSlots[0]?.attempts.at(-1)?.rawImageHash,
    } : null,
    disclosure: kind === 'codex' ? { containsSecrets: false, automaticJudges: [], reviewerIdentity: null } : null,
    createdAt: '2026-08-31T00:00:04.000Z',
  }
  const reportHash = canonicalHash(reportPayload)
  return { report: { ...reportPayload, reportHash }, reportHash, attestationHash: createHmac('sha256', secret).update(reportHash).digest('hex') }
}

function resignStateReport(signed: ReturnType<typeof signedStateReport>, secret: string) {
  const { reportHash: _innerReportHash, ...reportPayload } = signed.report
  signed.reportHash = canonicalHash(reportPayload)
  signed.report.reportHash = signed.reportHash
  signed.attestationHash = createHmac('sha256', secret).update(signed.reportHash).digest('hex')
}

function reviewAssignments(secret: string, fixture: ReturnType<typeof scientificBatchFixture>, state: any) {
  const slot = state.slots[0]
  const scientificCase = fixture.manifest.cases.find((candidate: any) => candidate.id === slot.caseId)!
  const attempt = slot.attempts.at(-1)
  const sourceSetHash = canonicalHash({ manifestHash: fixture.manifest.manifestHash, stateHash: state.stateHash })
  const assignment = (role: 'A' | 'B') => {
    const itemBase = {
      blindLabel: `blind-${role.toLowerCase()}-001`,
      itemHash: canonicalHash(`item:${slot.slotId}`),
      sourcePacketHash: canonicalHash(`source:${slot.slotId}`),
      caseId: scientificCase.id,
      kind: scientificCase.kind,
      applicableAxes: [...scientificCase.applicableAxes],
      imageHash: attempt.rawImageHash,
      rubric: structuredClone(scientificCase.rubric),
      instruction: scientificCase.instruction,
      ...(scientificCase.kind === 'generation'
        ? { negativePrompt: scientificCase.negativePrompt, aspectRatio: scientificCase.aspectRatio }
        : {}),
      ...(scientificCase.kind === 'edit' ? { sourceHash: scientificCase.sourceHash, editedHash: attempt.editedHash, region: scientificCase.region } : {}),
    }
    const packetBase = { schemaVersion: 2, batchManifestHash: fixture.manifest.manifestHash, packetId: `packet-${role}`, items: [itemBase] }
    const packet = { ...packetBase, packetHash: canonicalHash(packetBase) }
    const mapping = { packetHash: packet.packetHash, blindLabel: itemBase.blindLabel, itemHash: itemBase.itemHash, sourcePacketHash: itemBase.sourcePacketHash, modelKey: slot.canonicalModelId, runHash: canonicalHash(`run:${slot.canonicalModelId}`) }
    const privateEnvelope = {
      batchManifestHash: fixture.manifest.manifestHash,
      sourceSetHash,
      role,
      sources: [{ modelKey: slot.canonicalModelId, runHash: mapping.runHash, sourcePacketHash: mapping.sourcePacketHash, successItemSetHash: canonicalHash([itemBase.itemHash]) }],
      mappings: [mapping],
      packagesHash: canonicalHash([packet]),
    }
    return { role, packages: [packet], privateMappings: [mapping], privateEnvelope, mappingHash: canonicalHash(privateEnvelope) }
  }
  const reviewerA = assignment('A')
  const reviewerB = assignment('B')
  const assignmentSet = {
    batchManifestHash: fixture.manifest.manifestHash,
    sourceSetHash,
    reviewerAEnvelopeHash: canonicalHash(reviewerA.privateEnvelope),
    reviewerBEnvelopeHash: canonicalHash(reviewerB.privateEnvelope),
  }
  const assignmentAttestationHash = createHmac('sha256', secret).update(canonicalHash(assignmentSet)).digest('hex')
  return {
    A: { ...reviewerA, assignmentSet, assignmentAttestationHash },
    B: { ...reviewerB, assignmentSet, assignmentAttestationHash },
  }
}

function signedReviewerResult(secret: string, assignment: any, score: number, redLines: string[] = [], lowConfidence = false) {
  const publicItem = assignment.packages[0].items[0]
  const base = {
    role: assignment.role,
    batchManifestHash: assignment.privateEnvelope.batchManifestHash,
    sourceSetHash: assignment.privateEnvelope.sourceSetHash,
    assignmentAttestationHash: assignment.assignmentAttestationHash,
    assignmentSet: assignment.assignmentSet,
    mappingHash: assignment.mappingHash,
    items: [{
      packetHash: assignment.packages[0].packetHash,
      itemHash: publicItem.itemHash,
      applicableAxes: publicItem.applicableAxes,
      scores: Object.fromEntries(publicItem.applicableAxes.map((axis: string) => [axis, score])),
      redLines,
      lowConfidence,
    }],
  }
  const resultHash = canonicalHash(base)
  const signedBase = { ...base, resultHash }
  return { ...signedBase, resultAttestationHash: createHmac('sha256', secret).update(canonicalHash(signedBase)).digest('hex') }
}

function fullReviewAssignments(secret: string, fixture: ReturnType<typeof scientificBatchFixture>, state: any) {
  const succeeded = state.slots.filter((slot: any) => slot.status === 'succeeded')
  const sourceSetHash = canonicalHash({ manifestHash: fixture.manifest.manifestHash, stateHash: state.stateHash })
  const assignment = (role: 'A' | 'B') => {
    const ordered = role === 'A' ? succeeded : [...succeeded].reverse()
    const items = ordered.map((slot: any, index: number) => {
      const scientificCase = fixture.manifest.cases.find((candidate: any) => candidate.id === slot.caseId)!
      const attempt = slot.attempts.at(-1)
      return {
        blindLabel: `blind-${role.toLowerCase()}-${String(index + 1).padStart(3, '0')}`,
        itemHash: canonicalHash(`review-item:${slot.slotId}`),
        sourcePacketHash: canonicalHash(`review-source:${slot.slotId}`),
        caseId: scientificCase.id, kind: scientificCase.kind,
        applicableAxes: [...scientificCase.applicableAxes], imageHash: attempt.rawImageHash,
        rubric: structuredClone(scientificCase.rubric), instruction: scientificCase.instruction,
        ...(scientificCase.kind === 'generation'
          ? { negativePrompt: scientificCase.negativePrompt, aspectRatio: scientificCase.aspectRatio }
          : {}),
        ...(scientificCase.kind === 'edit' ? { sourceHash: scientificCase.sourceHash, editedHash: attempt.editedHash, region: scientificCase.region } : {}),
      }
    })
    const packetBase = { schemaVersion: 2, batchManifestHash: fixture.manifest.manifestHash, packetId: `full-packet-${role}`, items }
    const packet = { ...packetBase, packetHash: canonicalHash(packetBase) }
    const mappings = items.map((item: any) => {
      const slot = succeeded.find((candidate: any) => canonicalHash(`review-item:${candidate.slotId}`) === item.itemHash)!
      return { packetHash: packet.packetHash, blindLabel: item.blindLabel, itemHash: item.itemHash, sourcePacketHash: item.sourcePacketHash, modelKey: slot.canonicalModelId, runHash: canonicalHash(`run:${slot.canonicalModelId}`) }
    })
    const privateEnvelope = {
      batchManifestHash: fixture.manifest.manifestHash, sourceSetHash, role,
      sources: [...new Set(succeeded.map((slot: any) => slot.canonicalModelId))].map((modelKey) => {
        const modelMappings = mappings.filter((mapping: any) => mapping.modelKey === modelKey)
        return { modelKey, runHash: canonicalHash(`run:${modelKey}`), sourcePacketHash: canonicalHash(modelMappings.map((mapping: any) => mapping.sourcePacketHash)), successItemSetHash: canonicalHash(modelMappings.map((mapping: any) => mapping.itemHash).sort()) }
      }),
      mappings, packagesHash: canonicalHash([packet]),
    }
    return { role, packages: [packet], privateMappings: mappings, privateEnvelope, mappingHash: canonicalHash(privateEnvelope) }
  }
  const A = assignment('A')
  const B = assignment('B')
  const assignmentSet = { batchManifestHash: fixture.manifest.manifestHash, sourceSetHash, reviewerAEnvelopeHash: canonicalHash(A.privateEnvelope), reviewerBEnvelopeHash: canonicalHash(B.privateEnvelope) }
  const assignmentAttestationHash = createHmac('sha256', secret).update(canonicalHash(assignmentSet)).digest('hex')
  return { A: { ...A, assignmentSet, assignmentAttestationHash }, B: { ...B, assignmentSet, assignmentAttestationHash } }
}

function signedFullReviewerResult(secret: string, assignment: any, score = 8) {
  const base = {
    role: assignment.role, batchManifestHash: assignment.privateEnvelope.batchManifestHash,
    sourceSetHash: assignment.privateEnvelope.sourceSetHash, assignmentAttestationHash: assignment.assignmentAttestationHash,
    assignmentSet: assignment.assignmentSet, mappingHash: assignment.mappingHash,
    items: assignment.packages.flatMap((packet: any) => packet.items.map((item: any) => ({
      packetHash: packet.packetHash, itemHash: item.itemHash, applicableAxes: item.applicableAxes,
      scores: Object.fromEntries(item.applicableAxes.map((axis: string) => [axis, score])), redLines: [], lowConfidence: false,
    }))),
  }
  const resultHash = canonicalHash(base)
  const signed = { ...base, resultHash }
  return { ...signed, resultAttestationHash: createHmac('sha256', secret).update(canonicalHash(signed)).digest('hex') }
}

test('ensureSuite creates only the API-owned scientific v2 indexes and leaves the release index to root migration', async () => {
  const indexes: Array<{ collection: string; keys: Record<string, number>; options: Record<string, unknown> }> = []
  const collections = new Map<string, any>()
  const collection = (name: string) => {
    if (!collections.has(name)) collections.set(name, {
      async updateOne() { return { matchedCount: 1, modifiedCount: 1, upsertedCount: 0 } },
      async createIndex(keys: Record<string, number>, options: Record<string, unknown>) {
        if (name === 'paperbanana_benchmark_releases') throw new Error('release indexes are owned by the root migration')
        indexes.push({ collection: name, keys, options })
        return options.name
      },
    })
    return collections.get(name)
  }
  const repository = createMongoBenchmarkRepository({ collection } as any)

  await repository.ensureSuite()

  const byName = new Map(indexes.map((index) => [index.options.name, index]))
  assert.deepEqual(byName.get('scientific_v2_batch_id')?.keys, { batchId: 1 })
  assert.equal(byName.get('scientific_v2_batch_id')?.options.unique, true)
  assert.deepEqual(byName.get('scientific_v2_manifest_hash')?.keys, { manifestHash: 1 })
  assert.equal(byName.get('scientific_v2_manifest_hash')?.options.unique, true)
  assert.deepEqual(byName.get('scientific_v2_dispatch_identity')?.keys, { manifestHash: 1, slotId: 1, attemptIndex: 1 })
  assert.equal(byName.get('scientific_v2_dispatch_identity')?.options.unique, true)
  assert.deepEqual(byName.get('scientific_v2_review_identity')?.keys, { batchManifestHash: 1, sourceSetHash: 1, role: 1 })
  assert.equal(byName.get('scientific_v2_review_identity')?.options.unique, true)
  assert.deepEqual(byName.get('scientific_v2_public_evidence_identity')?.keys, { sourceReleaseHash: 1, profileId: 1, caseId: 1 })
  assert.equal(byName.get('scientific_v2_public_evidence_identity')?.options.unique, true)
  assert.equal(byName.has('scientific_v2_release_identity'), false)
  assert.deepEqual(
    [...byName.keys()].filter((name) => String(name).startsWith('scientific_v2_')).sort(),
    [
      'scientific_v2_batch_id',
      'scientific_v2_dispatch_identity',
      'scientific_v2_manifest_hash',
      'scientific_v2_public_evidence_identity',
      'scientific_v2_review_identity',
    ],
  )
})

test('freezeBatch independently rebuilds the Core canonical manifest and is immutable-idempotent', async () => {
  const fixture = scientificBatchFixture()
  const storage = scientificDb()
  const repository = createScientificV2MongoRepository(storage.db, () => FIXED_NOW)
  const input = { batchId: 'scientific-v2-batch-001', ...fixture }

  const frozen = await repository.freezeBatch(input)
  const replay = await repository.freezeBatch(input)

  assert.equal(frozen.batchId, input.batchId)
  assert.equal(frozen.manifestHash, fixture.manifest.manifestHash)
  assert.equal(frozen.stateHash, fixture.initialState.stateHash)
  assert.equal(replay.replayed, true)
  assert.equal(storage.rows.get('paperbanana_benchmark_scientific_v2_batches')?.length, 1)
})

test('remediation freeze resets only exact exhausted failures and rebinds carried Codex attempts', () => {
  const fixture = scientificBatchFixture({ secondBailianModel: true })
  const sourceState = completedScientificState(fixture)
  const targets = sourceState.slots.filter((slot: any) => slot.provider !== 'codex' && !slot.isProviderCanary).slice(0, 2)
  for (const slot of targets) {
    const previous = slot.attempts[0]
    slot.attempts = Array.from({ length: 4 }, (_, index) => {
      const base = {
        ...previous, attemptIndex: index + 1, responseClass: 'confirmed_technical_failure', actualCny: null,
        startedAt: `2026-08-31T00:00:0${index + 1}.000Z`, completedAt: `2026-08-31T00:00:0${index + 2}.000Z`,
        rawImageHash: null, byteSize: null, width: null, height: null, format: null,
        editedHash: null,
      }
      delete base.attemptHash
      return { ...base, attemptHash: canonicalHash(base) }
    })
    sourceState.providerSpentCny[slot.provider] += 3
    slot.status = 'failed'
    slot.costCny = 4
  }
  const source = refreshState(sourceState, '2026-08-31T00:00:09.000Z')
  const codexBefore = source.slots.find((slot: any) => slot.provider === 'codex').attempts[0]
  const remediation = buildScientificV2RemediationFreeze({
    sourceManifest: fixture.manifest,
    sourceState: source,
    codeSha: 'b'.repeat(40),
    targetSlotIds: targets.map((slot: any) => slot.slotId).sort(),
    now: new Date('2026-08-31T00:00:10.000Z'),
  })

  assert.equal(remediation.initialState.status, 'running')
  assert.equal(remediation.manifest.codeSha, 'b'.repeat(40))
  assert.notEqual(remediation.manifest.manifestHash, fixture.manifest.manifestHash)
  assert.ok(remediation.initialState.slots.filter((slot: any) => targets.some((target: any) => target.slotId === slot.slotId))
    .every((slot: any) => slot.status === 'pending' && slot.attempts.length === 0 && slot.costCny === null))
  const codexAfter = remediation.initialState.slots.find((slot: any) => slot.provider === 'codex').attempts[0]
  assert.notEqual(codexAfter.payloadHash, codexBefore.payloadHash)
  assert.notEqual(codexAfter.attemptHash, codexBefore.attemptHash)
  assert.doesNotThrow(() => verifyScientificV2ImportedState(remediation.initialState, remediation.manifest))
  assert.doesNotThrow(() => verifyWorkerScientificV2BatchManifest(remediation.manifest as never))
  assert.doesNotThrow(() => verifyWorkerScientificV2BatchState(remediation.initialState as never, remediation.manifest as never))
})

test('freezeBatch accepts Worker-shaped generation-only manifests with unsupported edit routes still pending initially', async () => {
  const fixture = scientificBatchFixture({ directEdit: false })
  const storage = scientificDb()
  const repository = createScientificV2MongoRepository(storage.db, () => FIXED_NOW, () => 'generation-only-claim', { immutableCodeSha: 'a'.repeat(40) })

  const frozen = await repository.freezeBatch({ batchId: 'scientific-v2-generation-only', ...fixture })

  assert.equal(frozen.manifestHash, fixture.manifest.manifestHash)
  const editSlots = fixture.initialState.slots.filter((slot: any) => !slot.supported)
  assert.equal(editSlots.length, 3)
  assert.ok(editSlots.every((slot: any) => slot.status === 'pending' && slot.costCny === null && slot.attempts.length === 0))
})

test('freezeBatch rejects a canonical manifest that differs from the authoritative registry snapshot', async () => {
  const fixture = scientificBatchFixture()
  const storage = scientificDb()
  const repository = createScientificV2MongoRepository(storage.db, () => FIXED_NOW)
  const tampered = structuredClone(fixture.canonicalManifest) as any
  tampered.models[0].displayName = 'tampered'

  await assert.rejects(
    () => repository.freezeBatch({ batchId: 'scientific-v2-batch-002', ...fixture, canonicalManifest: tampered }),
    /SCIENTIFIC_V2_CANONICAL_MANIFEST_MISMATCH/,
  )
  assert.equal(storage.rows.get('paperbanana_benchmark_scientific_v2_batches')?.length, 0)
})

test('freezeBatch rejects submitted code SHA drift and registry snapshots whose registryHash does not bind registry bytes', async () => {
  const fixture = scientificBatchFixture()
  const storage = scientificDb()
  const repository = createScientificV2MongoRepository(storage.db, () => FIXED_NOW, () => 'authority-claim', { immutableCodeSha: 'b'.repeat(40) })
  await assert.rejects(
    () => repository.freezeBatch({ batchId: 'scientific-v2-sha-drift', ...fixture }),
    /SCIENTIFIC_V2_CODE_SHA_MISMATCH/,
  )

  const registryTampered = structuredClone(fixture)
  registryTampered.manifest.codeSha = 'b'.repeat(40)
  const { manifestHash: _manifestHash, ...manifestBase } = registryTampered.manifest
  registryTampered.manifest.manifestHash = canonicalHash(manifestBase)
  registryTampered.initialState.manifestHash = registryTampered.manifest.manifestHash
  const { stateHash: _stateHash, ...stateBase } = registryTampered.initialState
  registryTampered.initialState.stateHash = canonicalHash(stateBase)
  registryTampered.registrySnapshot.registryHash = 'f'.repeat(64)
  const { snapshotHash: _snapshotHash, ...snapshotBase } = registryTampered.registrySnapshot
  registryTampered.registrySnapshot.snapshotHash = canonicalHash(snapshotBase)
  await assert.rejects(
    () => repository.freezeBatch({ batchId: 'scientific-v2-registry-hash-drift', ...registryTampered }),
    /SCIENTIFIC_V2_REGISTRY_HASH_MISMATCH/,
  )
})

test('freezeBatch rejects a conflicting replay for the same batch identity', async () => {
  const fixture = scientificBatchFixture()
  const storage = scientificDb()
  const repository = createScientificV2MongoRepository(storage.db, () => FIXED_NOW)
  await repository.freezeBatch({ batchId: 'scientific-v2-batch-003', ...fixture })
  const conflictingState = structuredClone(fixture.initialState) as any
  conflictingState.updatedAt = '2026-08-31T00:00:01.000Z'

  await assert.rejects(
    () => repository.freezeBatch({ batchId: 'scientific-v2-batch-003', ...fixture, initialState: conflictingState }),
    /SCIENTIFIC_V2_BATCH_CONFLICT/,
  )
})

test('freezeBatch resolves a concurrent duplicate-key insert by re-reading immutable identity', async () => {
  const fixture = scientificBatchFixture()
  const storage = atomicScientificDb()
  const first = createScientificV2MongoRepository(storage.db, () => FIXED_NOW)
  const input = { batchId: 'scientific-v2-freeze-race', ...fixture }
  await first.freezeBatch(input)
  const batches = storage.db.collection('paperbanana_benchmark_scientific_v2_batches')
  let reads = 0
  const racedDb = {
    ...storage.db,
    collection(name: string) {
      if (name !== 'paperbanana_benchmark_scientific_v2_batches') return storage.db.collection(name)
      return {
        ...batches,
        async findOne(query: any) {
          reads += 1
          if (reads <= 2) return null
          return batches.findOne(query)
        },
        async insertOne() {
          const error = new Error('duplicate key') as Error & { code: number }
          error.code = 11000
          throw error
        },
      }
    },
  }
  const second = createScientificV2MongoRepository(racedDb as any, () => FIXED_NOW)

  const replay = await second.freezeBatch(input)

  assert.equal(replay.replayed, true)
  assert.equal(replay.manifestHash, fixture.manifest.manifestHash)
})

test('scientific runner repository claims a ready batch exactly once with CAS', async () => {
  const fixture = scientificBatchFixture()
  const storage = atomicScientificDb()
  const repository = createScientificV2MongoRepository(storage.db, () => FIXED_NOW, () => 'claim-token-1')
  await repository.freezeBatch({ batchId: 'scientific-v2-batch-cas', ...fixture })

  const [first, second] = await Promise.all([
    repository.claimReady({ manifestHash: fixture.manifest.manifestHash, expectedReadyStateHash: fixture.initialState.stateHash }),
    repository.claimReady({ manifestHash: fixture.manifest.manifestHash, expectedReadyStateHash: fixture.initialState.stateHash }),
  ])

  assert.equal([first, second].filter(Boolean).length, 1)
  assert.equal((first || second)?.claimToken, 'claim-token-1')
  assert.equal((first || second)?.state.status, 'running')
})

test('scientific runner claim lease heartbeats, reclaims durable progress, and fences stale tokens', async (t) => {
  await t.test('zero progress heartbeat and reclaim', async () => {
    const fixture = scientificBatchFixture()
    const storage = atomicScientificDb()
    let clock = new Date('2026-08-31T01:00:00.000Z')
    const first = createScientificV2MongoRepository(storage.db, () => clock, () => 'lease-first-token', { claimLeaseMs: 1_000 })
    await first.freezeBatch({ batchId: 'scientific-v2-zero-progress-reclaim', ...fixture })
    const claim = await first.claimReady({ manifestHash: fixture.manifest.manifestHash, expectedReadyStateHash: fixture.initialState.stateHash })
    assert.ok(claim)
    assert.equal(claim.batchId, 'scientific-v2-zero-progress-reclaim')
    assert.equal(claim.revision, 1)
    let batch = storage.rows.get('paperbanana_benchmark_scientific_v2_batches')![0]
    assert.equal(batch.claimHeartbeatAt.toISOString(), clock.toISOString())
    assert.equal(batch.claimLeaseExpiresAt.toISOString(), new Date(clock.getTime() + 1_000).toISOString())

    clock = new Date(clock.getTime() + 500)
    await first.heartbeatClaim({ manifestHash: fixture.manifest.manifestHash, claimToken: claim.claimToken })
    batch = storage.rows.get('paperbanana_benchmark_scientific_v2_batches')![0]
    assert.equal(batch.claimLeaseExpiresAt.toISOString(), new Date(clock.getTime() + 1_000).toISOString())
    clock = new Date(clock.getTime() + 501)
    const early = createScientificV2MongoRepository(storage.db, () => clock, () => 'lease-too-early', { claimLeaseMs: 1_000 })
    assert.equal(await early.claimReady({ manifestHash: fixture.manifest.manifestHash, expectedReadyStateHash: fixture.initialState.stateHash }), null)

    clock = new Date(clock.getTime() + 500)
    const second = createScientificV2MongoRepository(storage.db, () => clock, () => 'lease-second-token', { claimLeaseMs: 1_000 })
    const reclaimed = await second.claimReady({ manifestHash: fixture.manifest.manifestHash, expectedReadyStateHash: fixture.initialState.stateHash })
    assert.ok(reclaimed)
    assert.equal(reclaimed.claimToken, 'lease-second-token')
    assert.equal(reclaimed.state.stateHash, claim.state.stateHash)
    await assert.rejects(() => first.saveClaimed({ claimToken: claim.claimToken, expectedStateHash: claim.state.stateHash, nextState: claim.state }), /SCIENTIFIC_V2_REPOSITORY_CAS_FAILED/)
    await assert.rejects(() => first.heartbeatClaim({ manifestHash: fixture.manifest.manifestHash, claimToken: claim.claimToken }), /SCIENTIFIC_V2_CLAIM_LEASE_LOST/)
  })

  await t.test('committed first slot survives stale reclaim', async () => {
    const fixture = scientificBatchFixture()
    const storage = atomicScientificDb()
    let clock = new Date('2026-08-31T02:00:00.000Z')
    const first = createScientificV2MongoRepository(storage.db, () => clock, () => 'commit-first-token', { claimLeaseMs: 1_000 })
    await first.freezeBatch({ batchId: 'scientific-v2-commit-reclaim', ...fixture })
    const claim = await first.claimReady({ manifestHash: fixture.manifest.manifestHash, expectedReadyStateHash: fixture.initialState.stateHash })
    assert.ok(claim)
    const slot = claim.state.slots[0]
    const marker = { manifestHash: fixture.manifest.manifestHash, slotId: slot.slotId, attemptIndex: 1, payloadHash: expectedSlotPayload(fixture, slot) }
    const { attempt, nextState } = successfulTransition(fixture, claim.state, slot)
    await first.beginDispatch({ claimToken: claim.claimToken, expectedStateHash: claim.state.stateHash, marker })
    await first.commitAttempt({ claimToken: claim.claimToken, expectedStateHash: claim.state.stateHash, marker, attempt, nextState })
    clock = new Date(clock.getTime() + 1_001)
    const second = createScientificV2MongoRepository(storage.db, () => clock, () => 'commit-second-token', { claimLeaseMs: 1_000 })
    const reclaimed = await second.claimReady({ manifestHash: fixture.manifest.manifestHash, expectedReadyStateHash: fixture.initialState.stateHash })
    assert.ok(reclaimed)
    assert.equal(reclaimed.state.stateHash, nextState.stateHash)
    assert.equal(reclaimed.state.slots[0].attempts[0].attemptHash, attempt.attemptHash)
    await assert.rejects(
      () => first.beginDispatch({ claimToken: claim.claimToken, expectedStateHash: nextState.stateHash, marker: { ...marker, slotId: nextState.slots[1].slotId, payloadHash: expectedSlotPayload(fixture, nextState.slots[1]) } }),
      /SCIENTIFIC_V2_REPOSITORY_CAS_FAILED/,
    )
  })

  await t.test('unresolved started marker blocks stale reclaim', async () => {
    const fixture = scientificBatchFixture()
    const storage = atomicScientificDb()
    let clock = new Date('2026-08-31T03:00:00.000Z')
    const first = createScientificV2MongoRepository(storage.db, () => clock, () => 'started-first-token', { claimLeaseMs: 1_000 })
    await first.freezeBatch({ batchId: 'scientific-v2-started-reclaim', ...fixture })
    const claim = await first.claimReady({ manifestHash: fixture.manifest.manifestHash, expectedReadyStateHash: fixture.initialState.stateHash })
    assert.ok(claim)
    const slot = claim.state.slots[0]
    await first.beginDispatch({
      claimToken: claim.claimToken, expectedStateHash: claim.state.stateHash,
      marker: { manifestHash: fixture.manifest.manifestHash, slotId: slot.slotId, attemptIndex: 1, payloadHash: expectedSlotPayload(fixture, slot) },
    })
    clock = new Date(clock.getTime() + 1_001)
    const second = createScientificV2MongoRepository(storage.db, () => clock, () => 'started-second-token', { claimLeaseMs: 1_000 })
    await assert.rejects(
      () => second.claimReady({ manifestHash: fixture.manifest.manifestHash, expectedReadyStateHash: fixture.initialState.stateHash }),
      /SCIENTIFIC_V2_STALE_CLAIM_RECONCILIATION_REQUIRED/,
    )
  })
})

test('commitAttempt is transaction-idempotent and resolveDispatch recovers a lost acknowledgement', async () => {
  const fixture = scientificBatchFixture()
  const storage = atomicScientificDb()
  const repository = createScientificV2MongoRepository(storage.db, () => FIXED_NOW, () => 'claim-token-2')
  await repository.freezeBatch({ batchId: 'scientific-v2-batch-ack-loss', ...fixture })
  const claim = await repository.claimReady({ manifestHash: fixture.manifest.manifestHash, expectedReadyStateHash: fixture.initialState.stateHash })
  assert.ok(claim)
  const slot = fixture.manifest.executionOrder[0]
  const marker = { manifestHash: fixture.manifest.manifestHash, slotId: slot.slotId, attemptIndex: 1, payloadHash: expectedSlotPayload(fixture, slot) }
  const { attempt, nextState } = successfulTransition(fixture, claim.state, slot)
  await repository.beginDispatch({ claimToken: claim.claimToken, expectedStateHash: claim.state.stateHash, marker })
  const batch = storage.rows.get('paperbanana_benchmark_scientific_v2_batches')![0]
  assert.equal(typeof batch.activeDispatchId, 'string')
  storage.loseNextCommitAck()

  await assert.rejects(
    () => repository.commitAttempt({ claimToken: claim.claimToken, expectedStateHash: claim.state.stateHash, marker, attempt, nextState }),
    /SIMULATED_ACK_LOSS/,
  )
  const resolution = await repository.resolveDispatch({ claimToken: claim.claimToken, marker })
  assert.equal(resolution.status, 'committed')
  assert.equal(resolution.status === 'committed' && resolution.state.stateHash, nextState.stateHash)
  assert.equal(batch.activeDispatchId, undefined)
  const replay = await repository.commitAttempt({ claimToken: claim.claimToken, expectedStateHash: claim.state.stateHash, marker, attempt, nextState })
  assert.equal(replay.stateHash, nextState.stateHash)
})

test('beginDispatch refuses a stale claim once the batch is no longer running', async () => {
  const fixture = scientificBatchFixture()
  const storage = atomicScientificDb()
  const repository = createScientificV2MongoRepository(storage.db, () => FIXED_NOW, () => 'stale-blocked-claim-token')
  await repository.freezeBatch({ batchId: 'scientific-v2-stale-blocked-claim', ...fixture })
  const claim = await repository.claimReady({ manifestHash: fixture.manifest.manifestHash, expectedReadyStateHash: fixture.initialState.stateHash })
  assert.ok(claim)
  const batch = storage.rows.get('paperbanana_benchmark_scientific_v2_batches')![0]
  batch.status = 'blocked'
  const slot = claim.state.slots[0]
  const marker = {
    manifestHash: fixture.manifest.manifestHash,
    slotId: slot.slotId,
    attemptIndex: 1,
    payloadHash: expectedSlotPayload(fixture, slot),
  }

  await assert.rejects(
    () => repository.beginDispatch({ claimToken: claim.claimToken, expectedStateHash: claim.state.stateHash, marker }),
    /SCIENTIFIC_V2_REPOSITORY_CAS_FAILED/,
  )
  assert.equal(storage.rows.get('paperbanana_benchmark_scientific_v2_dispatches')!.length, 0)
})

test('beginDispatch CAS-fences a lineage rotation between validation and dispatch reservation', async () => {
  const fixture = scientificBatchFixture()
  const storage = atomicScientificDb()
  const secret = 'scientific-v2-dispatch-reservation-race-secret-at-least-32-bytes'
  const repository = createScientificV2MongoRepository(storage.db, () => FIXED_NOW, () => 'dispatch-reservation-race-token', {
    operatorReportSecret: secret,
    immutableCodeSha: fixture.manifest.codeSha,
  })
  await repository.freezeBatch({ batchId: 'scientific-v2-dispatch-reservation-race', ...fixture })
  await repository.operatorAttestation({ batchId: 'scientific-v2-dispatch-reservation-race' })
  const claim = await repository.claimReady({ manifestHash: fixture.manifest.manifestHash, expectedReadyStateHash: fixture.initialState.stateHash })
  assert.ok(claim)
  const batch = storage.rows.get('paperbanana_benchmark_scientific_v2_batches')![0]
  const slot = claim.state.slots[0]
  const marker = {
    manifestHash: fixture.manifest.manifestHash,
    slotId: slot.slotId,
    attemptIndex: 1,
    payloadHash: expectedSlotPayload(fixture, slot),
  }
  storage.beforeNextDispatchReservation(() => {
    batch.executionCodeSha = 'c'.repeat(40)
  })

  await assert.rejects(
    () => repository.beginDispatch({ claimToken: claim.claimToken, expectedStateHash: claim.state.stateHash, marker }),
    /SCIENTIFIC_V2_REPOSITORY_CAS_FAILED/,
  )
  assert.equal(storage.rows.get('paperbanana_benchmark_scientific_v2_dispatches')!.length, 0)
  assert.equal(batch.activeDispatchId, undefined)
})

test('commitAttempt rolls back the batch state when the dispatch marker update fails', async () => {
  const fixture = scientificBatchFixture()
  const storage = atomicScientificDb()
  const repository = createScientificV2MongoRepository(storage.db, () => FIXED_NOW, () => 'claim-token-3')
  await repository.freezeBatch({ batchId: 'scientific-v2-batch-rollback', ...fixture })
  const claim = await repository.claimReady({ manifestHash: fixture.manifest.manifestHash, expectedReadyStateHash: fixture.initialState.stateHash })
  assert.ok(claim)
  const slot = fixture.manifest.executionOrder[0]
  const marker = { manifestHash: fixture.manifest.manifestHash, slotId: slot.slotId, attemptIndex: 1, payloadHash: expectedSlotPayload(fixture, slot) }
  const { attempt, nextState } = successfulTransition(fixture, claim.state, slot)
  await repository.beginDispatch({ claimToken: claim.claimToken, expectedStateHash: claim.state.stateHash, marker })
  storage.failNextDispatchUpdate()

  await assert.rejects(
    () => repository.commitAttempt({ claimToken: claim.claimToken, expectedStateHash: claim.state.stateHash, marker, attempt, nextState }),
    /SIMULATED_DISPATCH_UPDATE_FAILURE/,
  )
  storage.clearDispatchFailure()
  const batch = storage.rows.get('paperbanana_benchmark_scientific_v2_batches')![0]
  assert.equal(batch.stateHash, claim.state.stateHash)
  assert.equal((await repository.resolveDispatch({ claimToken: claim.claimToken, marker })).status, 'started')
})

test('markUnknown requires the exact started marker and expected state hash', async () => {
  const fixture = scientificBatchFixture()
  const storage = atomicScientificDb()
  const repository = createScientificV2MongoRepository(storage.db, () => FIXED_NOW, () => 'claim-token-4')
  await repository.freezeBatch({ batchId: 'scientific-v2-batch-unknown', ...fixture })
  const claim = await repository.claimReady({ manifestHash: fixture.manifest.manifestHash, expectedReadyStateHash: fixture.initialState.stateHash })
  assert.ok(claim)
  const unknownSlot = fixture.manifest.executionOrder[0]
  const marker = { manifestHash: fixture.manifest.manifestHash, slotId: unknownSlot.slotId, attemptIndex: 1, payloadHash: expectedSlotPayload(fixture, unknownSlot) }

  await assert.rejects(
    () => repository.markUnknown({ claimToken: claim.claimToken, expectedStateHash: claim.state.stateHash, marker, attempt: {}, conservativeCny: 1, nextState: refreshState(claim.state) }),
    /SCIENTIFIC_V2_(?:DISPATCH_MARKER_INVALID|ATTEMPT_MISMATCH)/,
  )
})

test('operatorAttestation exposes the exact disabled single-concurrency batch gate without the HMAC secret', async () => {
  const fixture = scientificBatchFixture()
  const storage = atomicScientificDb()
  const secret = 'scientific-v2-operator-secret-32-bytes-minimum'
  const repository = createScientificV2MongoRepository(storage.db, () => FIXED_NOW, () => 'claim-token-5', {
    operatorReportSecret: secret, immutableCodeSha: fixture.manifest.codeSha,
  })
  await repository.freezeBatch({ batchId: 'scientific-v2-batch-attestation', ...fixture })

  const attestation = await repository.operatorAttestation({ batchId: 'scientific-v2-batch-attestation' })

  assert.equal(attestation.batchManifestHash, fixture.manifest.manifestHash)
  assert.equal(attestation.stateHash, fixture.initialState.stateHash)
  assert.deepEqual(attestation.manifestSnapshot, fixture.manifest)
  assert.notStrictEqual(attestation.manifestSnapshot, storage.rows.get('paperbanana_benchmark_scientific_v2_batches')![0].manifest)
  assert.equal(attestation.manifestSnapshot.manifestHash, attestation.batchManifestHash)
  assert.equal(Object.isFrozen(attestation.manifestSnapshot), true)
  assert.deepEqual(attestation.stateSnapshot, fixture.initialState)
  assert.notStrictEqual(attestation.stateSnapshot, storage.rows.get('paperbanana_benchmark_scientific_v2_batches')![0].state)
  assert.equal(attestation.stateSnapshot.stateHash, attestation.stateHash)
  assert.equal(Object.isFrozen(attestation.stateSnapshot), true)
  assert.equal(Object.isFrozen(storage.rows.get('paperbanana_benchmark_scientific_v2_batches')![0].state), false)
  assert.doesNotThrow(() => verifyScientificV2ImportedState(attestation.stateSnapshot, fixture.manifest))
  assert.equal(attestation.manifestCodeSha, fixture.manifest.codeSha)
  assert.equal(attestation.executionCodeSha, fixture.manifest.codeSha)
  assert.equal(attestation.legacyRecoveryStateHash, null)
  assert.deepEqual(attestation.daemon, { enabled: false, status: 'configured-disabled' })
  assert.equal(attestation.concurrency, 1)
  assert.equal(attestation.lockName, '/run/lock/paperbanana-hk-production.lock')
  assert.deepEqual(attestation.providerBudgetsCny, { bailian: 180, ark: 180, openrouter: 360 })
  assert.equal(attestation.modelCount, fixture.manifest.models.length)
  assert.equal(attestation.slotCount, fixture.manifest.models.length * 9)
  assert.equal(attestation.codexToolCallLimit, 36)
  assert.equal(attestation.revision, 0)
  assert.equal(attestation.issuedAt, FIXED_NOW.toISOString())
  assert.equal(JSON.stringify(attestation).includes(secret), false)
  const operatorAttestationKey = createHmac('sha256', secret)
    .update('paperbanana/scientific-v2/operator-attestation/v1').digest()
  assert.equal(attestation.attestationHash, createHmac('sha256', operatorAttestationKey).update(attestation.reportHash).digest('hex'))
  assert.notEqual(attestation.attestationHash, createHmac('sha256', secret).update(attestation.reportHash).digest('hex'))
  const tampered = structuredClone(attestation)
  tampered.stateSnapshot.status = 'running'
  const { stateHash: _stateHash, ...tamperedStatePayload } = tampered.stateSnapshot
  assert.notEqual(canonicalHash(tamperedStatePayload), attestation.stateHash)
  const { manifestSnapshot: _manifestSnapshot, stateSnapshot: _stateSnapshot, reportHash: _reportHash, attestationHash: _attestationHash, ...signedPayload } = attestation
  assert.equal(canonicalHash(signedPayload), attestation.reportHash)
})

test('operatorAttestation rejects a stored state whose canonical content no longer binds its state hash', async () => {
  const fixture = scientificBatchFixture()
  const storage = atomicScientificDb()
  const repository = createScientificV2MongoRepository(storage.db, () => FIXED_NOW, () => 'attestation-state-binding', {
    operatorReportSecret: 'scientific-v2-state-binding-secret-at-least-32-bytes', immutableCodeSha: fixture.manifest.codeSha,
  })
  await repository.freezeBatch({ batchId: 'scientific-v2-attestation-state-binding', ...fixture })
  const batch = storage.rows.get('paperbanana_benchmark_scientific_v2_batches')![0]
  batch.state.slots[0].status = 'failed'

  await assert.rejects(
    () => repository.operatorAttestation({ batchId: 'scientific-v2-attestation-state-binding' }),
    /SCIENTIFIC_V2_/,
  )
})

test('operatorAttestation rejects a stored manifest whose canonical content no longer binds its manifest hash', async () => {
  const fixture = scientificBatchFixture()
  const storage = atomicScientificDb()
  const repository = createScientificV2MongoRepository(storage.db, () => FIXED_NOW, () => 'attestation-manifest-binding', {
    operatorReportSecret: 'scientific-v2-manifest-binding-secret-at-least-32-bytes', immutableCodeSha: fixture.manifest.codeSha,
  })
  await repository.freezeBatch({ batchId: 'scientific-v2-attestation-manifest-binding', ...fixture })
  const batch = storage.rows.get('paperbanana_benchmark_scientific_v2_batches')![0]
  batch.manifest.models[0].displayName = 'tampered display name'

  await assert.rejects(
    () => repository.operatorAttestation({ batchId: 'scientific-v2-attestation-manifest-binding' }),
    /SCIENTIFIC_V2_MANIFEST_HASH_INVALID/,
  )
})

test('operatorAttestation allows SHA drift only for the first exact legacy blocked recovery and fixes its lineage', async () => {
  const fixture = scientificBatchFixture()
  const storage = atomicScientificDb()
  const secret = 'scientific-v2-dual-sha-lineage-secret-at-least-32-bytes'
  const batchId = 'scientific-v2-dual-sha-lineage'
  const original = createScientificV2MongoRepository(storage.db, () => FIXED_NOW)
  await original.freezeBatch({ batchId, ...fixture })
  const executionCodeSha = 'b'.repeat(40)
  const recovery = createScientificV2MongoRepository(storage.db, () => FIXED_NOW, () => 'dual-sha-recovery', {
    operatorReportSecret: secret, immutableCodeSha: executionCodeSha,
  })

  await assert.rejects(() => recovery.operatorAttestation({ batchId }), /SCIENTIFIC_V2_CODE_LINEAGE_INVALID/)
  const batch = storage.rows.get('paperbanana_benchmark_scientific_v2_batches')![0]
  const legacyBlocked = blockedProviderCanaryState(fixture)
  batch.state = structuredClone(legacyBlocked)
  batch.stateHash = legacyBlocked.stateHash
  batch.status = 'blocked'

  const attestation = await recovery.operatorAttestation({ batchId })
  assert.equal(attestation.manifestCodeSha, fixture.manifest.codeSha)
  assert.equal(attestation.executionCodeSha, executionCodeSha)
  assert.equal(attestation.legacyRecoveryStateHash, legacyBlocked.stateHash)
  const { manifestSnapshot: _manifestSnapshot, stateSnapshot: _stateSnapshot, reportHash, attestationHash, ...payload } = attestation
  assert.equal(reportHash, canonicalHash(payload))
  const key = createHmac('sha256', secret).update('paperbanana/scientific-v2/operator-attestation/v1').digest()
  assert.equal(attestationHash, createHmac('sha256', key).update(reportHash).digest('hex'))

  const recovered = completedScientificState(fixture)
  batch.state = structuredClone(recovered)
  batch.stateHash = recovered.stateHash
  batch.status = 'completed'
  const replay = await recovery.operatorAttestation({ batchId })
  assert.deepEqual(
    [replay.manifestCodeSha, replay.executionCodeSha, replay.legacyRecoveryStateHash],
    [fixture.manifest.codeSha, executionCodeSha, legacyBlocked.stateHash],
  )
  const differentRuntime = createScientificV2MongoRepository(storage.db, () => FIXED_NOW, () => 'dual-sha-drift', {
    operatorReportSecret: secret, immutableCodeSha: 'c'.repeat(40),
  })
  await assert.rejects(() => differentRuntime.operatorAttestation({ batchId }), /SCIENTIFIC_V2_CODE_LINEAGE_INVALID/)

  const ordinaryStorage = atomicScientificDb()
  const ordinary = createScientificV2MongoRepository(ordinaryStorage.db, () => FIXED_NOW)
  await ordinary.freezeBatch({ batchId: 'scientific-v2-ordinary-sha-drift', ...fixture })
  const ordinaryBatch = ordinaryStorage.rows.get('paperbanana_benchmark_scientific_v2_batches')![0]
  const ordinaryCompleted = completedScientificState(fixture)
  ordinaryBatch.state = structuredClone(ordinaryCompleted)
  ordinaryBatch.stateHash = ordinaryCompleted.stateHash
  ordinaryBatch.status = 'completed'
  const mismatched = createScientificV2MongoRepository(ordinaryStorage.db, () => FIXED_NOW, () => 'ordinary-sha-drift', {
    operatorReportSecret: secret, immutableCodeSha: executionCodeSha,
  })
  await assert.rejects(
    () => mismatched.operatorAttestation({ batchId: 'scientific-v2-ordinary-sha-drift' }),
    /SCIENTIFIC_V2_CODE_LINEAGE_INVALID/,
  )

  const sameShaStorage = atomicScientificDb()
  const sameShaOriginal = createScientificV2MongoRepository(sameShaStorage.db, () => FIXED_NOW)
  const sameShaBatchId = 'scientific-v2-same-sha-blocked'
  await sameShaOriginal.freezeBatch({ batchId: sameShaBatchId, ...fixture })
  const sameShaBatch = sameShaStorage.rows.get('paperbanana_benchmark_scientific_v2_batches')![0]
  sameShaBatch.state = structuredClone(legacyBlocked)
  sameShaBatch.stateHash = legacyBlocked.stateHash
  sameShaBatch.status = 'blocked'
  const sameSha = createScientificV2MongoRepository(sameShaStorage.db, () => FIXED_NOW, () => 'same-sha-blocked', {
    operatorReportSecret: secret, immutableCodeSha: fixture.manifest.codeSha,
  })
  assert.equal((await sameSha.operatorAttestation({ batchId: sameShaBatchId })).legacyRecoveryStateHash, null)
})

test('operatorAttestation permits one pre-execution SHA rotation for an unchanged legacy blocked recovery', async () => {
  const fixture = scientificBatchFixture()
  const storage = atomicScientificDb()
  const secret = 'scientific-v2-pre-execution-rotation-secret-at-least-32-bytes'
  const batchId = 'scientific-v2-pre-execution-rotation'
  const original = createScientificV2MongoRepository(storage.db, () => FIXED_NOW)
  await original.freezeBatch({ batchId, ...fixture })
  const batch = storage.rows.get('paperbanana_benchmark_scientific_v2_batches')![0]
  const legacyBlocked = blockedProviderCanaryState(fixture)
  batch.state = structuredClone(legacyBlocked)
  batch.stateHash = legacyBlocked.stateHash
  batch.status = 'blocked'

  const firstExecutionSha = 'b'.repeat(40)
  const firstRecovery = createScientificV2MongoRepository(storage.db, () => FIXED_NOW, () => 'first-recovery', {
    operatorReportSecret: secret, immutableCodeSha: firstExecutionSha,
  })
  const first = await firstRecovery.operatorAttestation({ batchId })
  assert.equal(first.executionCodeSha, firstExecutionSha)

  const rollbackRecovery = createScientificV2MongoRepository(storage.db, () => FIXED_NOW, () => 'rollback-recovery', {
    operatorReportSecret: secret, immutableCodeSha: fixture.manifest.codeSha,
  })
  await assert.rejects(() => rollbackRecovery.operatorAttestation({ batchId }), /SCIENTIFIC_V2_CODE_LINEAGE_INVALID/)

  storage.rows.get('paperbanana_benchmark_scientific_v2_dispatches')!.push({
    _id: 'scientific-v2-unresolved-pre-execution-marker',
    manifestHash: fixture.manifest.manifestHash,
    status: 'started',
  })
  const inFlightRecovery = createScientificV2MongoRepository(storage.db, () => FIXED_NOW, () => 'in-flight-recovery', {
    operatorReportSecret: secret, immutableCodeSha: 'c'.repeat(40),
  })
  await assert.rejects(() => inFlightRecovery.operatorAttestation({ batchId }), /SCIENTIFIC_V2_CODE_LINEAGE_INVALID/)
  storage.rows.get('paperbanana_benchmark_scientific_v2_dispatches')!.splice(0)

  delete batch.lineageRecoveryRotationUsed

  const rotatedExecutionSha = 'c'.repeat(40)
  const rotatedRecovery = createScientificV2MongoRepository(storage.db, () => FIXED_NOW, () => 'rotated-recovery', {
    operatorReportSecret: secret, immutableCodeSha: rotatedExecutionSha,
  })
  const rotated = await rotatedRecovery.operatorAttestation({ batchId })
  assert.equal(rotated.executionCodeSha, rotatedExecutionSha)
  assert.equal(rotated.legacyRecoveryStateHash, legacyBlocked.stateHash)
  assert.equal(batch.executionCodeSha, rotatedExecutionSha)
  assert.equal(batch.lineageRecoveryRotationUsed, true)

  const secondRotation = createScientificV2MongoRepository(storage.db, () => FIXED_NOW, () => 'second-rotation', {
    operatorReportSecret: secret, immutableCodeSha: 'd'.repeat(40),
  })
  await assert.rejects(() => secondRotation.operatorAttestation({ batchId }), /SCIENTIFIC_V2_CODE_LINEAGE_INVALID/)
})

test('operatorDiagnostic returns a bounded attested read-only provider-canary summary', async () => {
  const fixture = scientificBatchFixture()
  const storage = atomicScientificDb()
  const secret = 'scientific-v2-diagnostic-secret-at-least-32-bytes'
  const repository = createScientificV2MongoRepository(storage.db, () => FIXED_NOW, () => 'diagnostic-claim-token', { operatorReportSecret: secret })
  const batchId = 'scientific-v2-diagnostic-batch'
  await repository.freezeBatch({ batchId, ...fixture })
  const state = blockedProviderCanaryState(fixture)
  const batch = storage.rows.get('paperbanana_benchmark_scientific_v2_batches')![0]
  batch.state = structuredClone(state)
  batch.stateHash = state.stateHash
  batch.revision = 1

  const diagnostic = await repository.operatorDiagnostic({ batchId, manifestHash: fixture.manifest.manifestHash })

  assert.deepEqual(Object.keys(diagnostic).sort(), [
    'attestationHash', 'batchId', 'blockReason', 'diagnosticHash', 'manifestHash', 'pauseReason',
    'providerCanaries', 'providerSpentCny', 'providerUnreconciledCny', 'revision', 'stateHash', 'status',
  ])
  assert.equal(diagnostic.batchId, batchId)
  assert.equal(diagnostic.manifestHash, fixture.manifest.manifestHash)
  assert.equal(diagnostic.stateHash, state.stateHash)
  assert.equal(diagnostic.status, 'blocked')
  assert.equal(diagnostic.pauseReason, null)
  assert.equal(diagnostic.blockReason, 'provider_canary_failed')
  assert.deepEqual(diagnostic.providerSpentCny, { bailian: 4, ark: 0, openrouter: 0 })
  assert.deepEqual(diagnostic.providerUnreconciledCny, { bailian: 0, ark: 0, openrouter: 0 })
  assert.equal(diagnostic.revision, 1)
  assert.deepEqual(diagnostic.providerCanaries, [{
    provider: 'bailian', canonicalModelId: fixture.manifest.executionOrder[0].canonicalModelId,
    caseId: fixture.manifest.executionOrder[0].caseId, slotId: fixture.manifest.executionOrder[0].slotId,
    status: 'failed', attemptCount: 4,
    responseClasses: ['confirmed_provider_failure', 'confirmed_provider_failure', 'confirmed_provider_failure', 'confirmed_provider_failure'],
    estimatedCny: 4, actualCny: null,
  }])
  const { diagnosticHash, attestationHash, ...diagnosticPayload } = diagnostic
  assert.equal(diagnosticHash, canonicalHash(diagnosticPayload))
  const diagnosticKey = createHmac('sha256', secret)
    .update('paperbanana/scientific-v2/operator-diagnostic/v1').digest()
  assert.equal(attestationHash, createHmac('sha256', diagnosticKey).update(diagnosticHash).digest('hex'))
  assert.doesNotMatch(JSON.stringify(diagnostic), /payloadHash|objectKey|startedAt|completedAt|rawImageHash|reviewer|artifact|secret/i)
  await assert.rejects(
    () => repository.operatorDiagnostic({ batchId, manifestHash: 'f'.repeat(64) }),
    /SCIENTIFIC_V2_BATCH_NOT_FOUND/,
  )
  batch.manifestHash = 'e'.repeat(64)
  await assert.rejects(
    () => repository.operatorDiagnostic({ batchId, manifestHash: batch.manifestHash }),
    /SCIENTIFIC_V2_OPERATOR_DIAGNOSTIC_BINDING_INVALID/,
  )
  batch.manifestHash = fixture.manifest.manifestHash
  batch.stateHash = 'e'.repeat(64)
  await assert.rejects(
    () => repository.operatorDiagnostic({ batchId, manifestHash: fixture.manifest.manifestHash }),
    /SCIENTIFIC_V2_OPERATOR_DIAGNOSTIC_BINDING_INVALID/,
  )
})

test('canonical state operation report contract fixes identity, JSON hash and exact secret-free HMAC payload', () => {
  const fixture = scientificBatchFixture()
  const state = completedScientificState(fixture)
  const legacy = signedStateReport('unused-secret-at-least-32-bytes-long', fixture, state).report
  const normalized = normalizeScientificV2StateOperationReport({
    ...legacy,
    identity: { ...SCIENTIFIC_BENCHMARK_IDENTITY },
  })
  const { reportHash, ...canonicalPayload } = normalized

  assert.deepEqual(Object.keys(normalized), [
    'schemaVersion', 'identity', 'kind', 'batchId', 'batchManifestHash', 'revision', 'previousStateHash',
    'stateHash', 'state', 'manifestCodeSha', 'executionCodeSha', 'legacyRecoveryStateHash',
    'providerCanaryAttestation', 'executionOrderAttestation', 'codexProvenance',
    'disclosure', 'createdAt', 'reportHash',
  ])
  assert.deepEqual(normalized.identity, SCIENTIFIC_BENCHMARK_IDENTITY)
  assert.equal(reportHash, canonicalHash(canonicalPayload))
  assert.equal(scientificV2StateOperationReportHmacPayload(normalized), reportHash)
  assert.equal(JSON.stringify(normalized).includes('secret'), false)
  assert.notEqual(normalized.state, state)
  for (const invalidLineage of [
    { manifestCodeSha: fixture.manifest.codeSha, executionCodeSha: fixture.manifest.codeSha, legacyRecoveryStateHash: 'e'.repeat(64) },
    { manifestCodeSha: fixture.manifest.codeSha, executionCodeSha: 'b'.repeat(40), legacyRecoveryStateHash: null },
  ]) {
    const { reportHash: _reportHash, ...payload } = legacy
    assert.throws(
      () => normalizeScientificV2StateOperationReport({ ...payload, ...invalidLineage }),
      /SCIENTIFIC_V2_OPERATION_REPORT_SCHEMA_INVALID/,
    )
  }
})

test('canonical state operation report ships one stable JSON and hash fixture for the Worker adapter', () => {
  const fixturePath = new URL('./fixtures/scientific-v2-state-operation-report.json', import.meta.url)
  const fixtureDocument = JSON.parse(readFileSync(fixturePath, 'utf8'))

  assert.deepEqual(normalizeScientificV2StateOperationReport(fixtureDocument), fixtureDocument)
  assert.equal(scientificV2StateOperationReportHmacPayload(fixtureDocument), fixtureDocument.reportHash)
})

test('canonical signed state operation import shape accepts the fixture and rejects identity or hash drift', () => {
  const fixturePath = new URL('./fixtures/scientific-v2-state-operation-report.json', import.meta.url)
  const fixtureDocument = JSON.parse(readFileSync(fixturePath, 'utf8'))
  const secret = 'scientific-v2-import-shape-secret-32-bytes'
  const signed = {
    report: fixtureDocument,
    reportHash: fixtureDocument.reportHash,
    attestationHash: createHmac('sha256', secret).update(fixtureDocument.reportHash).digest('hex'),
  }

  assert.deepEqual(normalizeScientificV2SignedStateOperationReport(signed, secret), signed)
  for (const mutate of [
    (value: any) => { delete value.report.identity },
    (value: any) => { value.report.identity.suiteId = 'wrong-suite' },
    (value: any) => { value.report.reportHash = '0'.repeat(64) },
    (value: any) => { value.reportHash = '1'.repeat(64) },
    (value: any) => { value.report.executionCodeSha = 'b'.repeat(40) },
    (value: any) => { value.report.legacyRecoveryStateHash = 'e'.repeat(64) },
    (value: any) => { value.report.extra = true },
  ]) {
    const changed = structuredClone(signed)
    mutate(changed)
    assert.throws(() => normalizeScientificV2SignedStateOperationReport(changed, secret), /SCIENTIFIC_V2_(?:OPERATION|OPERATOR)_REPORT_/)
  }
})

test('importStateReport verifies the HMAC and every terminal attempt before marking review ready', async () => {
  const fixture = scientificBatchFixture()
  const state = completedScientificState(fixture)
  const storage = atomicScientificDb()
  const secret = 'scientific-v2-import-secret-at-least-32-bytes'
  const repository = createScientificV2MongoRepository(storage.db, () => FIXED_NOW, () => 'claim-token-6', { operatorReportSecret: secret })
  await repository.freezeBatch({ batchId: 'scientific-v2-batch-import', ...fixture })
  const signed = signedStateReport(secret, fixture, state)

  const imported = await repository.importStateReport(signed)

  assert.equal(imported.reviewReady, true)
  assert.equal(imported.stateHash, state.stateHash)
  const batch = storage.rows.get('paperbanana_benchmark_scientific_v2_batches')![0]
  assert.equal(batch.status, 'review_ready')
  assert.equal(batch.stateHash, state.stateHash)
})

test('state report import binds ordinary and legacy recovery dual-SHA lineage across revisions', async () => {
  const fixture = scientificBatchFixture()
  const secret = 'scientific-v2-state-report-lineage-secret-at-least-32-bytes'
  const ordinaryStorage = atomicScientificDb()
  const ordinary = createScientificV2MongoRepository(ordinaryStorage.db, () => FIXED_NOW, () => 'ordinary-lineage', {
    operatorReportSecret: secret, immutableCodeSha: fixture.manifest.codeSha,
  })
  const ordinaryBatchId = 'scientific-v2-ordinary-lineage'
  await ordinary.freezeBatch({ batchId: ordinaryBatchId, ...fixture })
  const ordinaryState = completedScientificState(fixture)
  await ordinary.importStateReport(signedStateReport(secret, fixture, ordinaryState, 'codex', { batchId: ordinaryBatchId }))

  const laterState = refreshState(ordinaryState, '2026-08-31T00:00:10.000Z')
  for (const changed of [
    signedStateReport(secret, fixture, laterState, 'codex', {
      batchId: ordinaryBatchId, previousStateHash: ordinaryState.stateHash, revision: 2, executionCodeSha: 'b'.repeat(40),
    }),
    signedStateReport(secret, fixture, laterState, 'codex', {
      batchId: ordinaryBatchId, previousStateHash: ordinaryState.stateHash, revision: 2, legacyRecoveryStateHash: 'e'.repeat(64),
    }),
  ]) {
    await assert.rejects(() => ordinary.importStateReport(changed), /SCIENTIFIC_V2_(?:CODE_LINEAGE|OPERATION_REPORT_SCHEMA)_INVALID/)
  }

  const legacyStorage = atomicScientificDb()
  const original = createScientificV2MongoRepository(legacyStorage.db, () => FIXED_NOW)
  const legacyBatchId = 'scientific-v2-legacy-report-lineage'
  await original.freezeBatch({ batchId: legacyBatchId, ...fixture })
  const legacyBatch = legacyStorage.rows.get('paperbanana_benchmark_scientific_v2_batches')![0]
  const blocked = blockedProviderCanaryState(fixture)
  legacyBatch.state = structuredClone(blocked)
  legacyBatch.stateHash = blocked.stateHash
  legacyBatch.status = 'blocked'
  const executionCodeSha = 'b'.repeat(40)
  const recovery = createScientificV2MongoRepository(legacyStorage.db, () => FIXED_NOW, () => 'legacy-report-lineage', {
    operatorReportSecret: secret, immutableCodeSha: executionCodeSha,
  })
  const attestation = await recovery.operatorAttestation({ batchId: legacyBatchId })
  const recoveredState = completedScientificState(fixture)
  const recoveredReport = signedStateReport(secret, fixture, recoveredState, 'codex', {
    batchId: legacyBatchId, previousStateHash: blocked.stateHash,
    manifestCodeSha: attestation.manifestCodeSha, executionCodeSha: attestation.executionCodeSha,
    legacyRecoveryStateHash: attestation.legacyRecoveryStateHash,
  })
  assert.equal((await recovery.importStateReport(recoveredReport)).reviewReady, true)

  const nextState = refreshState(recoveredState, '2026-08-31T00:00:11.000Z')
  const driftedRecovery = signedStateReport(secret, fixture, nextState, 'codex', {
    batchId: legacyBatchId, previousStateHash: recoveredState.stateHash, revision: 2,
    manifestCodeSha: fixture.manifest.codeSha, executionCodeSha,
    legacyRecoveryStateHash: 'f'.repeat(64),
  })
  await assert.rejects(() => recovery.importStateReport(driftedRecovery), /SCIENTIFIC_V2_CODE_LINEAGE_INVALID/)
})

test('Core imports a signed worker canary_complete report and full import preserves the original canary attempt', async () => {
  const fixture = scientificBatchFixture()
  const secret = 'scientific-v2-canary-import-secret-32-bytes'
  const storage = atomicScientificDb()
  const repository = createScientificV2MongoRepository(storage.db, () => FIXED_NOW, () => 'canary-import-claim', { operatorReportSecret: secret })
  const batchId = 'scientific-v2-canary-import'
  await repository.freezeBatch({ batchId, ...fixture })
  const canaryState = canaryCompleteScientificState(fixture)
  const claim = await repository.claimReady({ manifestHash: fixture.manifest.manifestHash, expectedReadyStateHash: fixture.initialState.stateHash })
  assert.ok(claim)
  const persistedCanary = await repository.saveClaimed({
    claimToken: claim.claimToken, expectedStateHash: claim.state.stateHash, nextState: canaryState,
  })
  const canaryAttempt = persistedCanary.slots.find((slot: any) => slot.isProviderCanary).attempts[0]
  const canaryReport = signedStateReport(secret, fixture, persistedCanary, 'worker', {
    batchId, previousStateHash: claim.state.stateHash, revision: 1,
  })
  assert.deepEqual(await repository.importStateReport(canaryReport), {
    stateHash: persistedCanary.stateHash, reviewReady: false, replayed: false,
  })
  const canaryBatch = storage.rows.get('paperbanana_benchmark_scientific_v2_batches')![0]
  assert.equal(canaryBatch.status, 'canary_complete')
  assert.equal(canaryBatch.state.slots.find((slot: any) => slot.isProviderCanary).attempts.length, 1)

  const fullState = completedScientificState(fixture)
  const fullCanary = fullState.slots.find((slot: any) => slot.isProviderCanary)
  fullState.providerSpentCny[fullCanary.provider] -= fullCanary.costCny
  fullCanary.attempts = [structuredClone(canaryAttempt)]
  fullCanary.costCny = canaryAttempt.actualCny
  fullState.providerSpentCny[fullCanary.provider] += fullCanary.costCny
  const resumedFullState = refreshState(fullState, '2026-08-31T00:00:05.000Z')
  const fullReport = signedStateReport(secret, fixture, resumedFullState, 'worker', {
    batchId, previousStateHash: persistedCanary.stateHash, revision: 2,
  })
  const importedFull = await repository.importStateReport(fullReport)
  assert.equal(importedFull.stateHash, resumedFullState.stateHash)
  const finalCanary = storage.rows.get('paperbanana_benchmark_scientific_v2_batches')![0].state.slots.find((slot: any) => slot.isProviderCanary)
  assert.equal(finalCanary.attempts.length, 1)
  assert.equal(finalCanary.attempts[0].attemptHash, canaryAttempt.attemptHash)
})

test('importStateReport attaches an already-persisted worker state exactly once and rejects stale, self-loop, codex, or failed-CAS attachments', async () => {
  const fixture = scientificBatchFixture()
  const secret = 'scientific-v2-worker-attachment-secret-32-bytes'
  const prepare = async () => {
    const storage = atomicScientificDb()
    const repository = createScientificV2MongoRepository(storage.db, () => FIXED_NOW, () => 'worker-attachment-claim', { operatorReportSecret: secret })
    await repository.freezeBatch({ batchId: 'scientific-v2-worker-attachment', ...fixture })
    const claim = await repository.claimReady({ manifestHash: fixture.manifest.manifestHash, expectedReadyStateHash: fixture.initialState.stateHash })
    assert.ok(claim)
    const state = awaitingScientificState(fixture)
    const persisted = await repository.saveClaimed({ claimToken: claim.claimToken, expectedStateHash: claim.state.stateHash, nextState: state })
    const signed = signedStateReport(secret, fixture, persisted, 'worker', {
      batchId: 'scientific-v2-worker-attachment', previousStateHash: claim.state.stateHash, revision: 1,
    })
    return { storage, repository, claim, state: persisted, signed }
  }

  const accepted = await prepare()
  const imported = await accepted.repository.importStateReport(accepted.signed)
  assert.deepEqual(imported, { stateHash: accepted.state.stateHash, reviewReady: false, replayed: false })
  const acceptedBatch = accepted.storage.rows.get('paperbanana_benchmark_scientific_v2_batches')![0]
  assert.equal(acceptedBatch.stateHash, accepted.state.stateHash)
  assert.equal(acceptedBatch.stateTransitionFromHash, accepted.claim.state.stateHash)
  assert.equal((await accepted.repository.importStateReport(accepted.signed)).replayed, true)

  for (const mutate of [
    (value: ReturnType<typeof signedStateReport>, prepared: Awaited<ReturnType<typeof prepare>>) => { value.report.previousStateHash = prepared.state.stateHash },
    (value: ReturnType<typeof signedStateReport>) => { value.report.previousStateHash = 'f'.repeat(64) },
    (value: ReturnType<typeof signedStateReport>) => { value.report.kind = 'codex' },
  ]) {
    const prepared = await prepare()
    mutate(prepared.signed, prepared)
    resignStateReport(prepared.signed, secret)
    await assert.rejects(() => prepared.repository.importStateReport(prepared.signed), /SCIENTIFIC_V2_(?:IMPORT|CODEX)/)
  }

  const conflicted = await prepare()
  conflicted.storage.failNextStateAttachmentBatchCas()
  await assert.rejects(() => conflicted.repository.importStateReport(conflicted.signed), /SCIENTIFIC_V2_IMPORT_STATE_CONFLICT/)
  assert.equal(conflicted.storage.rows.get('paperbanana_benchmark_scientific_v2_reviews')?.length || 0, 0)
})

test('importStateReport rejects HMAC, attempt, unknown and budget tampering', async () => {
  const fixture = scientificBatchFixture()
  const secret = 'scientific-v2-import-secret-at-least-32-bytes'
  const cases = [
    (signed: any) => { signed.attestationHash = '0'.repeat(64) },
    (signed: any) => { signed.report.state.slots[0].attempts[0].rawImageHash = 'f'.repeat(64) },
    (signed: any) => { signed.report.state.slots[0].status = 'unknown' },
    (signed: any) => { signed.report.state.providerSpentCny.bailian = 181 },
  ]
  for (const [index, mutate] of cases.entries()) {
    const storage = atomicScientificDb()
    const repository = createScientificV2MongoRepository(storage.db, () => FIXED_NOW, () => `claim-token-${index + 10}`, { operatorReportSecret: secret })
    await repository.freezeBatch({ batchId: 'scientific-v2-batch-import', ...fixture })
    const signed = signedStateReport(secret, fixture, completedScientificState(fixture)) as any
    mutate(signed)
    if (index > 0) {
      signed.report.stateHash = signed.report.state.stateHash
      resignStateReport(signed, secret)
    }
    await assert.rejects(() => repository.importStateReport(signed), /SCIENTIFIC_V2_(?:OPERATOR_REPORT|STATE|ATTEMPT|IMPORT)/)
  }
})

test('independent state validation accepts four confirmed failures with nullable actual cost and charges the estimate', () => {
  const fixture = scientificBatchFixture()
  const state = completedScientificState(fixture) as any
  const slot = state.slots.find((candidate: any) => candidate.provider !== 'codex' && !candidate.isProviderCanary)!
  const successful = slot.attempts[0]
  slot.attempts = Array.from({ length: 4 }, (_, index) => {
    const base = {
      ...successful,
      attemptIndex: index + 1,
      responseClass: 'confirmed_provider_failure',
      actualCny: null,
      rawImageHash: null,
      byteSize: null,
      width: null,
      height: null,
      format: null,
      editedHash: null,
    }
    delete base.attemptHash
    return { ...base, attemptHash: canonicalHash(base) }
  })
  slot.status = 'failed'
  slot.costCny = 4
  state.providerSpentCny.bailian += 3
  const refreshed = refreshState(state)

  assert.doesNotThrow(() => verifyScientificV2ImportedState(refreshed, fixture.manifest))
})

test('state verifier rejects awaiting_artifacts with pending slots, invalid ISO time and CNY precision beyond 8 decimals', () => {
  const fixture = scientificBatchFixture()
  const invalidStates = [
    (() => {
      const state: any = structuredClone(fixture.initialState)
      state.status = 'awaiting_artifacts'
      return refreshState(state)
    })(),
    (() => {
      const state: any = structuredClone(fixture.initialState)
      state.updatedAt = 'not-an-iso-instant'
      return refreshState(state, 'not-an-iso-instant')
    })(),
    (() => {
      const state = completedScientificState(fixture) as any
      const slot = state.slots.find((candidate: any) => candidate.provider === 'bailian')!
      slot.attempts[0].actualCny = 1.000000001
      const { attemptHash: _attemptHash, ...attemptBase } = slot.attempts[0]
      slot.attempts[0].attemptHash = canonicalHash(attemptBase)
      slot.costCny = 1.000000001
      state.providerSpentCny.bailian = state.providerSpentCny.bailian - 1 + 1.000000001
      return refreshState(state)
    })(),
  ]
  for (const state of invalidStates) {
    assert.throws(() => verifyScientificV2ImportedState(state, fixture.manifest), /SCIENTIFIC_V2_(?:STATE|ATTEMPT|CNY)/)
  }
})

test('state verifier rejects paused unknown interruption when any later slot remains pending', () => {
  const fixture = scientificBatchFixture()
  assert.throws(
    () => verifyScientificV2ImportedState(interruptedState(fixture, 'unknown'), fixture.manifest),
    /SCIENTIFIC_V2_STATE_INTERRUPTION_ORDER_INVALID/,
  )
})

test('state verifier rejects blocked interruption when any later slot remains pending', () => {
  const fixture = scientificBatchFixture()
  assert.throws(
    () => verifyScientificV2ImportedState(interruptedState(fixture, 'blocked'), fixture.manifest),
    /SCIENTIFIC_V2_STATE_INTERRUPTION_ORDER_INVALID/,
  )
})

test('state verifier rejects price reconciliation without a price increase or cumulative provider budget crossing', () => {
  const fixture = scientificBatchFixture()
  assert.throws(
    () => verifyScientificV2ImportedState(invalidPriceReconciliationState(fixture), fixture.manifest),
    /SCIENTIFIC_V2_PRICE_RECONCILIATION_INVALID/,
  )
})

test('API and Worker accept only the ordered four-attempt provider canary blocked state', async (t) => {
  const fixture = scientificBatchFixture()
  const accepted = blockedProviderCanaryState(fixture)
  assert.doesNotThrow(() => verifyWorkerScientificV2BatchState(accepted as any, fixture.manifest as any))
  assert.doesNotThrow(() => verifyScientificV2ImportedState(accepted, fixture.manifest))

  const mutations: Array<[string, () => any]> = [
    ['later slot remains pending', () => {
      const state = blockedProviderCanaryState(fixture)
      state.slots[1].status = 'pending'
      return refreshState(state)
    }],
    ['canary has only three failures', () => {
      const state = blockedProviderCanaryState(fixture)
      const slot = state.slots.find((candidate: any) => candidate.isProviderCanary)!
      slot.attempts.pop()
      slot.costCny = 3
      state.providerSpentCny[slot.provider] = 3
      return refreshState(state)
    }],
    ['non-canary terminal appears after interruption', () => {
      const state = blockedProviderCanaryState(fixture)
      const slot = state.slots[1]
      slot.status = 'unsupported'
      slot.supported = false
      slot.provider = null
      slot.modelId = null
      slot.routeStatus = 'no_direct_edit_route'
      slot.costCny = 0
      return refreshState(state)
    }],
  ]
  for (const [name, build] of mutations) await t.test(name, () => {
    const state = build()
    assert.throws(() => verifyWorkerScientificV2BatchState(state, fixture.manifest as any), /SCIENTIFIC_V2_/)
    assert.throws(() => verifyScientificV2ImportedState(state, fixture.manifest), /SCIENTIFIC_V2_/)
  })
})

test('API propagates a four-attempt canary failure only across the exact provider and canonical model route', async (t) => {
  const fixture = scientificBatchFixture({ secondBailianModel: true, splitCanonicalAcrossProviders: true })
  const accepted = propagatedProviderCanaryFailureState(fixture)
  assert.doesNotThrow(() => verifyScientificV2ImportedState(accepted, fixture.manifest))
  const failedCanary = accepted.slots.find((slot: any) => slot.isProviderCanary && slot.status === 'failed')!
  assert.ok(accepted.slots.some((slot: any) => slot.provider === failedCanary.provider
    && slot.canonicalModelId !== failedCanary.canonicalModelId && slot.status === 'succeeded'))
  assert.ok(accepted.slots.some((slot: any) => slot.provider !== failedCanary.provider
    && slot.canonicalModelId === failedCanary.canonicalModelId && slot.status === 'succeeded'))

  const mutations: Array<[string, (state: any) => void]> = [
    ['propagated failure has a nonzero cost', (state) => {
      state.slots.find((slot: any) => slot.status === 'failed' && !slot.isProviderCanary)!.costCny = 1
    }],
    ['propagated failure contains an attempt', (state) => {
      const propagated = state.slots.find((slot: any) => slot.status === 'failed' && !slot.isProviderCanary)!
      propagated.attempts = [structuredClone(state.slots.find((slot: any) => slot.isProviderCanary)!.attempts[0])]
    }],
    ['provider canary has fewer than four confirmed failures', (state) => {
      const canary = state.slots.find((slot: any) => slot.isProviderCanary)!
      canary.attempts.pop()
      canary.costCny -= 1
      state.providerSpentCny[canary.provider] -= 1
    }],
    ['one same-model slot is not propagated', (state) => {
      const propagated = state.slots.find((slot: any) => slot.status === 'failed' && !slot.isProviderCanary)!
      const completed = completedScientificState(fixture).slots.find((slot: any) => slot.slotId === propagated.slotId)!
      propagated.status = 'succeeded'
      propagated.costCny = completed.costCny
      propagated.attempts = structuredClone(completed.attempts)
      state.providerSpentCny[propagated.provider] += completed.costCny
    }],
    ['a different canonical model on the same provider is propagated', (state) => {
      const canary = state.slots.find((slot: any) => slot.isProviderCanary && slot.status === 'failed')!
      const otherModelSlot = state.slots.find((slot: any) => slot.provider === canary.provider
        && slot.canonicalModelId !== canary.canonicalModelId && slot.status === 'succeeded')!
      state.providerSpentCny[otherModelSlot.provider] -= otherModelSlot.costCny
      otherModelSlot.status = 'failed'
      otherModelSlot.costCny = 0
      otherModelSlot.attempts = []
    }],
    ['the same canonical model on a different provider is propagated', (state) => {
      const canary = state.slots.find((slot: any) => slot.isProviderCanary && slot.status === 'failed')!
      const otherRouteSlot = state.slots.find((slot: any) => slot.provider !== canary.provider
        && slot.canonicalModelId === canary.canonicalModelId && slot.status === 'succeeded')!
      state.providerSpentCny[otherRouteSlot.provider] -= otherRouteSlot.costCny
      otherRouteSlot.status = 'failed'
      otherRouteSlot.costCny = 0
      otherRouteSlot.attempts = []
    }],
  ]
  for (const [name, mutate] of mutations) await t.test(name, () => {
    const state = structuredClone(accepted)
    mutate(state)
    assert.throws(() => verifyScientificV2ImportedState(refreshState(state), fixture.manifest), /SCIENTIFIC_V2_/)
  })
})

test('provider canary blocked state persists but cannot enter report, review, or publish', async () => {
  const fixture = scientificBatchFixture()
  const state = blockedProviderCanaryState(fixture)
  const storage = atomicScientificDb()
  const secret = 'scientific-v2-provider-canary-blocked-secret-32-bytes'
  const batchId = 'scientific-v2-provider-canary-blocked'
  const repository = createScientificV2MongoRepository(storage.db, () => FIXED_NOW, () => 'provider-canary-blocked-token', { operatorReportSecret: secret })
  await repository.freezeBatch({ batchId, ...fixture })
  const claim = await repository.claimReady({ manifestHash: fixture.manifest.manifestHash, expectedReadyStateHash: fixture.initialState.stateHash })
  assert.ok(claim)
  await repository.saveClaimed({ claimToken: claim.claimToken, expectedStateHash: claim.state.stateHash, nextState: state })
  const batch = storage.rows.get('paperbanana_benchmark_scientific_v2_batches')![0]
  assert.equal(batch.status, 'blocked')
  assert.equal(batch.state.blockReason, 'provider_canary_failed')
  const signed = signedStateReport(secret, fixture, state, 'worker', { batchId, previousStateHash: claim.state.stateHash, revision: 1 })
  await assert.rejects(() => repository.importStateReport(signed), /SCIENTIFIC_V2_(?:CODE_LINEAGE|OPERATION_ATTESTATION|IMPORT_WORKER_STATE|IMPORT_REVISION)/)
  await assert.rejects(() => repository.exportReviewAssignment({ batchId, assignment: {}, objectBindings: [] }), /SCIENTIFIC_V2_REVIEW_BATCH_NOT_READY/)
  await assert.rejects(() => repository.publishScientificV2({ batchId, objectBindings: [], evidence: [] }), /SCIENTIFIC_V2_BATCH_NOT_PUBLISHABLE/)
  assert.equal((storage.rows.get('paperbanana_benchmark_scientific_v2_review_artifacts') || []).length, 0)
})

test('API and Worker accept the exact conservative artifact reconciliation pause and reject ordering or ledger drift', async (t) => {
  const fixture = scientificBatchFixture()
  const accepted = artifactReconciliationState(fixture)
  assert.doesNotThrow(() => verifyWorkerScientificV2BatchState(accepted as any, fixture.manifest as any))
  assert.doesNotThrow(() => verifyScientificV2ImportedState(accepted, fixture.manifest))

  const mutations: Array<[string, () => any]> = [
    ['nonterminal slot before interruption', () => artifactReconciliationState(fixture, 1)],
    ['pending slot after interruption', () => {
      const state = artifactReconciliationState(fixture)
      state.slots.at(-1).status = 'pending'
      return refreshState(state)
    }],
    ['actual cost above estimate', () => {
      const state = artifactReconciliationState(fixture)
      const slot = state.slots[0]
      slot.attempts[0].actualCny = 2
      const { attemptHash: _attemptHash, ...attemptBase } = slot.attempts[0]
      slot.attempts[0].attemptHash = canonicalHash(attemptBase)
      slot.costCny = 2
      state.providerSpentCny[slot.provider] = 2
      return refreshState(state)
    }],
    ['unreconciled ledger drift', () => {
      const state = artifactReconciliationState(fixture)
      state.providerUnreconciledCny.bailian = 1
      return refreshState(state)
    }],
    ['artifact image facts missing', () => {
      const state = artifactReconciliationState(fixture)
      const attempt = state.slots[0].attempts[0]
      attempt.rawImageHash = null
      attempt.byteSize = null
      attempt.width = null
      attempt.height = null
      attempt.format = null
      const { attemptHash: _attemptHash, ...attemptBase } = attempt
      attempt.attemptHash = canonicalHash(attemptBase)
      return refreshState(state)
    }],
  ]
  for (const [name, build] of mutations) await t.test(name, () => {
    const state = build()
    assert.throws(() => verifyWorkerScientificV2BatchState(state, fixture.manifest as any), /SCIENTIFIC_V2_/)
    assert.throws(() => verifyScientificV2ImportedState(state, fixture.manifest), /SCIENTIFIC_V2_/)
  })
})

test('artifact reconciliation can persist only as a paused Mongo state and cannot enter import, review, or publish', async () => {
  const fixture = scientificBatchFixture()
  const state = artifactReconciliationState(fixture)
  const storage = atomicScientificDb()
  const secret = 'scientific-v2-artifact-reconciliation-secret-32-bytes'
  const batchId = 'scientific-v2-artifact-reconciliation'
  const repository = createScientificV2MongoRepository(storage.db, () => FIXED_NOW, () => 'artifact-reconciliation-claim', { operatorReportSecret: secret })
  await repository.freezeBatch({ batchId, ...fixture })
  const claim = await repository.claimReady({ manifestHash: fixture.manifest.manifestHash, expectedReadyStateHash: fixture.initialState.stateHash })
  assert.ok(claim)
  await repository.saveClaimed({ claimToken: claim.claimToken, expectedStateHash: claim.state.stateHash, nextState: state })
  const batch = storage.rows.get('paperbanana_benchmark_scientific_v2_batches')![0]
  assert.equal(batch.status, 'paused')
  assert.equal(batch.state.pauseReason, 'artifact_reconciliation_required')
  const signed = signedStateReport(secret, fixture, state, 'worker', { batchId, previousStateHash: claim.state.stateHash, revision: 1 })
  await assert.rejects(() => repository.importStateReport(signed), /SCIENTIFIC_V2_(?:OPERATION_ATTESTATION|IMPORT_WORKER_STATE|IMPORT_REVISION)/)
  await assert.rejects(() => repository.exportReviewAssignment({ batchId, assignment: {}, objectBindings: [] }), /SCIENTIFIC_V2_REVIEW_BATCH_NOT_READY/)
  await assert.rejects(() => repository.publishScientificV2({ batchId, objectBindings: [], evidence: [] }), /SCIENTIFIC_V2_BATCH_NOT_PUBLISHABLE/)
  assert.equal((storage.rows.get('paperbanana_benchmark_scientific_v2_review_artifacts') || []).length, 0)
})

test('artifact recovery keeps its spool binding private and atomically resumes the exact paid attempt', async () => {
  const fixture = scientificBatchFixture()
  const paused = artifactReconciliationState(fixture)
  const recovered = recoveredArtifactState(fixture, paused)
  assert.doesNotThrow(() => verifyWorkerScientificV2BatchState(recovered as any, fixture.manifest as any))
  assert.doesNotThrow(() => verifyScientificV2ImportedState(recovered, fixture.manifest))
  const pausedSlot = paused.slots.find((slot: any) => slot.status === 'artifact_reconciliation')!
  const recoveredSlot = recovered.slots.find((slot: any) => slot.slotId === pausedSlot.slotId)!
  assert.equal(recoveredSlot.attempts[0].rawImageHash, pausedSlot.attempts[0].rawImageHash)
  assert.equal(recoveredSlot.attempts[0].responseClass, 'succeeded')
  assert.notEqual(recoveredSlot.attempts[0].attemptHash, pausedSlot.attempts[0].attemptHash)
  assert.equal(JSON.stringify(recovered).includes('spoolId'), false)

  const storage = atomicScientificDb()
  const secret = 'scientific-v2-artifact-recovery-secret-at-least-32-bytes'
  const batchId = 'scientific-v2-artifact-recovery'
  const first = createScientificV2MongoRepository(storage.db, () => FIXED_NOW, () => 'artifact-recovery-first', {
    operatorReportSecret: secret, claimLeaseMs: 1_000,
  })
  await first.freezeBatch({ batchId, ...fixture })
  const claim = await first.claimReady({ manifestHash: fixture.manifest.manifestHash, expectedReadyStateHash: fixture.initialState.stateHash })
  assert.ok(claim)
  const marker = {
    manifestHash: fixture.manifest.manifestHash, slotId: pausedSlot.slotId, attemptIndex: 1,
    payloadHash: pausedSlot.attempts[0].payloadHash,
  }
  const imageHash = pausedSlot.attempts[0].rawImageHash
  const artifactRecovery = {
    spoolId: `${canonicalHash({ slotId: marker.slotId, attemptIndex: 1, payloadHash: marker.payloadHash, imageHash })}.png`,
    imageHash, format: 'png', byteSize: pausedSlot.attempts[0].byteSize,
  }
  await first.beginDispatch({ claimToken: claim.claimToken, expectedStateHash: claim.state.stateHash, marker })
  await first.commitAttempt({
    claimToken: claim.claimToken, expectedStateHash: claim.state.stateHash, marker,
    attempt: pausedSlot.attempts[0], nextState: paused, artifactRecovery,
  })
  let batch = storage.rows.get('paperbanana_benchmark_scientific_v2_batches')![0]
  let dispatch = storage.rows.get('paperbanana_benchmark_scientific_v2_dispatches')![0]
  assert.equal(batch.status, 'paused')
  assert.deepEqual(dispatch.artifactRecovery, artifactRecovery)
  const preRecoveryReport = signedStateReport(secret, fixture, paused, 'worker', { batchId, previousStateHash: claim.state.stateHash, revision: 1 })
  await assert.rejects(() => first.importStateReport(preRecoveryReport), /SCIENTIFIC_V2_(?:OPERATION_ATTESTATION|IMPORT_WORKER_STATE|IMPORT_REVISION)/)

  await assert.rejects(() => first.reconcileArtifact({
    batchId, manifestHash: fixture.manifest.manifestHash, expectedStateHash: paused.stateHash,
    marker, imageHash: 'f'.repeat(64), nextState: recovered,
  }), /SCIENTIFIC_V2_ARTIFACT_RECONCILIATION_BINDING_INVALID/)
  batch = storage.rows.get('paperbanana_benchmark_scientific_v2_batches')![0]
  assert.equal(batch.stateHash, paused.stateHash)

  storage.failNextDispatchUpdate()
  await assert.rejects(() => first.reconcileArtifact({
    batchId, manifestHash: fixture.manifest.manifestHash, expectedStateHash: paused.stateHash,
    marker, imageHash, nextState: recovered,
  }), /SIMULATED_DISPATCH_UPDATE_FAILURE/)
  storage.clearDispatchFailure()
  batch = storage.rows.get('paperbanana_benchmark_scientific_v2_batches')![0]
  dispatch = storage.rows.get('paperbanana_benchmark_scientific_v2_dispatches')![0]
  assert.equal(batch.stateHash, paused.stateHash)
  assert.equal(dispatch.attempt.responseClass, 'artifact_reconciliation_required')

  const persisted = await first.reconcileArtifact({
    batchId, manifestHash: fixture.manifest.manifestHash, expectedStateHash: paused.stateHash,
    marker, imageHash, nextState: recovered,
  })
  assert.equal(persisted.stateHash, recovered.stateHash)
  batch = storage.rows.get('paperbanana_benchmark_scientific_v2_batches')![0]
  dispatch = storage.rows.get('paperbanana_benchmark_scientific_v2_dispatches')![0]
  assert.equal(batch.status, 'running')
  assert.equal(batch.stateTransitionFromHash, paused.stateHash)
  assert.equal(batch.claimLeaseExpiresAt.toISOString(), new Date(0).toISOString())
  assert.equal(dispatch.attempt.responseClass, 'succeeded')
  assert.equal(dispatch.state.stateHash, recovered.stateHash)
  assert.deepEqual(dispatch.artifactRecovery, artifactRecovery)

  const postRecoveryReport = signedStateReport(secret, fixture, recovered, 'worker', { batchId, previousStateHash: paused.stateHash, revision: 1 })
  await assert.rejects(() => first.importStateReport(postRecoveryReport), /SCIENTIFIC_V2_(?:OPERATION_ATTESTATION|IMPORT_WORKER_STATE|IMPORT_REVISION)/)
  await assert.rejects(() => first.exportReviewAssignment({ batchId, assignment: {}, objectBindings: [] }), /SCIENTIFIC_V2_REVIEW_BATCH_NOT_READY/)
  await assert.rejects(() => first.publishScientificV2({ batchId, objectBindings: [], evidence: [] }), /SCIENTIFIC_V2_BATCH_NOT_PUBLISHABLE/)

  const second = createScientificV2MongoRepository(storage.db, () => FIXED_NOW, () => 'artifact-recovery-second', { claimLeaseMs: 1_000 })
  const reclaimed = await second.claimReady({ manifestHash: fixture.manifest.manifestHash, expectedReadyStateHash: fixture.initialState.stateHash })
  assert.ok(reclaimed)
  assert.equal(reclaimed.state.stateHash, recovered.stateHash)
})

test('saveClaimed and commitAttempt reject semantically invalid state and mismatched attempt despite valid hashes', async () => {
  const fixture = scientificBatchFixture()
  const storage = atomicScientificDb()
  const repository = createScientificV2MongoRepository(storage.db, () => FIXED_NOW, () => 'strict-cas-claim')
  await repository.freezeBatch({ batchId: 'scientific-v2-strict-cas', ...fixture })
  const claim = await repository.claimReady({ manifestHash: fixture.manifest.manifestHash, expectedReadyStateHash: fixture.initialState.stateHash })
  assert.ok(claim)
  const invalid = structuredClone(claim.state) as any
  invalid.status = 'awaiting_artifacts'
  const invalidState = refreshState(invalid)
  await assert.rejects(
    () => repository.saveClaimed({ claimToken: claim.claimToken, expectedStateHash: claim.state.stateHash, nextState: invalidState }),
    /SCIENTIFIC_V2_STATE_STATUS_INVALID/,
  )

  const slot = fixture.manifest.executionOrder[0]
  const marker = { manifestHash: fixture.manifest.manifestHash, slotId: slot.slotId, attemptIndex: 1, payloadHash: expectedSlotPayload(fixture, slot) }
  const { attempt, nextState } = successfulTransition(fixture, claim.state, slot)
  await repository.beginDispatch({ claimToken: claim.claimToken, expectedStateHash: claim.state.stateHash, marker })
  await assert.rejects(
    () => repository.commitAttempt({ claimToken: claim.claimToken, expectedStateHash: claim.state.stateHash, marker, attempt: { ...attempt, attemptHash: 'f'.repeat(64) }, nextState }),
    /SCIENTIFIC_V2_ATTEMPT_MISMATCH/,
  )
})

test('existing adminBenchmarkControl repository method delegates the scientific v2 diagnostic without a new action', async () => {
  const fixture = scientificBatchFixture()
  const storage = atomicScientificDb()
  const secret = 'scientific-v2-control-secret-at-least-32-bytes'
  const repository = createMongoBenchmarkRepository(
    storage.db,
    () => FIXED_NOW,
    async () => {},
    'a'.repeat(40),
    async () => new Uint8Array(),
    { operatorReportSecret: secret, createClaimToken: () => 'control-claim-token' },
  )

  const frozen = await repository.control({ evaluationMode: 'codex_scientific_v2', command: 'freezeBatch', batchId: 'scientific-v2-control-batch', ...fixture }) as any
  const attestation = await repository.control({ evaluationMode: 'codex_scientific_v2', command: 'operatorAttestation', batchId: 'scientific-v2-control-batch' }) as any
  const diagnostic = await repository.control({
    evaluationMode: 'codex_scientific_v2', command: 'operatorDiagnostic',
    batchId: 'scientific-v2-control-batch', manifestHash: fixture.manifest.manifestHash,
  }) as any

  assert.equal(frozen.manifestHash, fixture.manifest.manifestHash)
  assert.equal(attestation.batchManifestHash, fixture.manifest.manifestHash)
  assert.equal(diagnostic.diagnosticHash, canonicalHash(Object.fromEntries(Object.entries(diagnostic).filter(([key]) => !['diagnosticHash', 'attestationHash'].includes(key)))))
  const transportDiagnostic = await repository.control({
    evaluationMode: 'codex_scientific_v2', command: 'operatorDiagnostic',
    batchId: 'scientific-v2-control-batch', manifestHash: fixture.manifest.manifestHash, gatewayToken: 'trusted-transport-only',
  }) as any
  assert.equal(transportDiagnostic.diagnosticHash, diagnostic.diagnosticHash)
  await assert.rejects(
    () => repository.control({
      evaluationMode: 'codex_scientific_v2', command: 'operatorDiagnostic',
      batchId: 'scientific-v2-control-batch', manifestHash: fixture.manifest.manifestHash, ignored: true,
    }),
    /SCIENTIFIC_V2_OPERATOR_DIAGNOSTIC_SCHEMA_INVALID/,
  )
})

test('review export stores private mappings but returns only the public blind assignment', async () => {
  const fixture = scientificBatchFixture()
  const state = completedScientificState(fixture)
  const storage = atomicScientificDb()
  const secret = 'scientific-v2-review-secret-at-least-32-bytes'
  const repository = createScientificV2MongoRepository(storage.db, () => FIXED_NOW, () => 'review-claim-token', { operatorReportSecret: secret })
  await repository.freezeBatch({ batchId: 'scientific-v2-review-batch', ...fixture })
  const imported = signedStateReport(secret, fixture, state)
  imported.report.batchId = 'scientific-v2-review-batch'
  resignStateReport(imported, secret)
  await repository.importStateReport(imported)
  const assignments = reviewAssignments(secret, fixture, state)

  const reviewImageHash = assignments.A.packages[0].items[0].imageHash
  const exported = await repository.exportReviewAssignment({
    batchId: 'scientific-v2-review-batch',
    assignment: assignments.A,
    objectBindings: [{ imageHash: reviewImageHash, objectKey: `bench/scientific-v2/private/objects/${reviewImageHash}.png` }],
  })

  assert.equal(exported.role, 'A')
  assert.equal('privateMappings' in exported, false)
  assert.equal('privateEnvelope' in exported, false)
  assert.equal(JSON.stringify(exported).includes(slotModelKey(assignments.A)), false)
  assert.deepEqual(exported._objectBindings, [{ imageHash: reviewImageHash, objectKey: `bench/scientific-v2/private/objects/${reviewImageHash}.png` }])
  const stored = storage.rows.get('paperbanana_benchmark_scientific_v2_review_artifacts') || []
  assert.equal(stored.some((row) => row.artifactType === 'review_assignment_private'), true)
})

function slotModelKey(assignment: any) {
  return assignment.privateMappings[0].modelKey
}

async function preparePublishFacts(repository: ReturnType<typeof createScientificV2MongoRepository>, fixture: ReturnType<typeof scientificBatchFixture>, state: any, secret: string, batchId: string, options: {
  dispute?: boolean
  lineage?: { manifestCodeSha: string; executionCodeSha: string; legacyRecoveryStateHash: string | null }
} = {}) {
  const claimed = await repository.claimReady({ manifestHash: fixture.manifest.manifestHash, expectedReadyStateHash: fixture.initialState.stateHash })
  assert.ok(claimed)
  let current = claimed.state as any
  for (const finalSlot of state.slots.filter((slot: any) => slot.provider && slot.provider !== 'codex' && slot.attempts.length)) {
    for (const attempt of finalSlot.attempts) {
      const next = structuredClone(current)
      const nextSlot = next.slots.find((slot: any) => slot.slotId === finalSlot.slotId)!
      nextSlot.attempts = structuredClone(finalSlot.attempts.slice(0, attempt.attemptIndex))
      nextSlot.costCny = nextSlot.attempts.reduce((sum: number, item: any) => sum + (item.actualCny ?? item.estimatedCny), 0)
      nextSlot.status = attempt.attemptIndex === finalSlot.attempts.length ? finalSlot.status : 'retrying'
      next.providerSpentCny[finalSlot.provider] += attempt.actualCny ?? attempt.estimatedCny
      if (nextSlot.isProviderCanary && nextSlot.status === 'failed') {
        for (const propagated of state.slots.filter((slot: any) => slot.provider === finalSlot.provider
          && !slot.isProviderCanary && slot.status === 'failed' && slot.attempts.length === 0)) {
          const target = next.slots.find((slot: any) => slot.slotId === propagated.slotId)!
          target.status = 'failed'
          target.costCny = 0
          target.attempts = []
        }
      }
      next.updatedAt = '2026-08-31T00:00:03.000Z'
      delete next.stateHash
      next.stateHash = canonicalHash(next)
      const marker = { manifestHash: fixture.manifest.manifestHash, slotId: finalSlot.slotId, attemptIndex: attempt.attemptIndex, payloadHash: attempt.payloadHash }
      await repository.beginDispatch({ claimToken: claimed.claimToken, expectedStateHash: current.stateHash, marker })
      current = await repository.commitAttempt({ claimToken: claimed.claimToken, expectedStateHash: current.stateHash, marker, attempt, nextState: next })
    }
  }
  const awaiting = structuredClone(current)
  awaiting.status = 'awaiting_artifacts'
  for (const slot of awaiting.slots) if (slot.provider === 'codex') slot.status = 'awaiting_artifact'
  awaiting.updatedAt = '2026-08-31T00:00:04.000Z'
  delete awaiting.stateHash
  awaiting.stateHash = canonicalHash(awaiting)
  const workerImport = signedStateReport(secret, fixture, awaiting, 'worker', {
    batchId, previousStateHash: current.stateHash, revision: 1, ...options.lineage,
  })
  await repository.importStateReport(workerImport)
  const codexImport = signedStateReport(secret, fixture, state, 'codex', {
    batchId, previousStateHash: awaiting.stateHash, revision: 2, ...options.lineage,
  })
  await repository.importStateReport(codexImport)
  const assignments = fullReviewAssignments(secret, fixture, state)
  const bindingsFor = (assignment: any) => assignment.packages.flatMap((packet: any) => packet.items.map((item: any) => ({ imageHash: item.imageHash, objectKey: `bench/scientific-v2/private/objects/${item.imageHash}.png` })))
  await repository.exportReviewAssignment({ batchId, assignment: assignments.A, objectBindings: bindingsFor(assignments.A) })
  await repository.exportReviewAssignment({ batchId, assignment: assignments.B, objectBindings: bindingsFor(assignments.B) })
  await repository.importReviewResult({ batchId, result: signedFullReviewerResult(secret, assignments.A, options.dispute ? 5 : 8) })
  const reviewFinal = await repository.importReviewResult({ batchId, result: signedFullReviewerResult(secret, assignments.B, 8) }) as any
  if (options.dispute) {
    const arbitration = {
      reasoningEffort: 'xhigh', batchManifestHash: fixture.manifest.manifestHash,
      sourceSetHash: assignments.A.privateEnvelope.sourceSetHash,
      results: reviewFinal.disputes.map((item: any) => ({
        itemHash: item.itemHash,
        scores: Object.fromEntries(item.applicableAxes.map((axis: string) => [axis, 7])),
        redLines: [],
      })),
    }
    const arbitrationHash = canonicalHash(arbitration)
    await repository.importArbitration({
      batchId, arbitration, arbitrationHash,
      attestationHash: createHmac('sha256', secret).update(arbitrationHash).digest('hex'),
    })
  }

  const objectBindings: any[] = []
  const evidence: any[] = []
  for (const slot of state.slots) {
    const scientificCase = fixture.manifest.cases.find((candidate: any) => candidate.id === slot.caseId)!
    if (slot.status !== 'succeeded') continue
    const attempt = slot.attempts.at(-1)
    objectBindings.push({ imageHash: attempt.rawImageHash, objectKey: `bench/scientific-v2/private/objects/${attempt.rawImageHash}.${attempt.format}` })
    const renditionHash = canonicalHash(`webp:${attempt.rawImageHash}`)
    evidence.push({
      caseId: slot.caseId, canonicalModelId: slot.canonicalModelId, imageHash: attempt.rawImageHash,
      requestedResolution: slot.imageSize,
      actualOutputPixels: {
        width: attempt.width, height: attempt.height,
        megapixels: Number(((attempt.width * attempt.height) / 1_000_000).toFixed(4)),
        fileSizeBytes: attempt.byteSize,
      },
      variants: [{ kind: 'detail', objectKey: `bench/scientific-v2/public/${attempt.rawImageHash}/detail.webp`, imageHash: renditionHash, width: 1600, height: 900, fileSizeBytes: 2048, mimeType: 'image/webp' }],
      ...(scientificCase.kind === 'edit' ? {
        sourceHash: scientificCase.sourceHash,
        beforeVariants: [{ kind: 'detail', objectKey: `bench/scientific-v2/public/${scientificCase.sourceHash}/detail.webp`, imageHash: canonicalHash(`webp:${scientificCase.sourceHash}`), width: 1600, height: 900, fileSizeBytes: 2048, mimeType: 'image/webp' }],
      } : {}),
    })
  }
  const sourceHash = (fixture.manifest.cases.find((item: any) => item.kind === 'edit') as any)?.sourceHash
  if (sourceHash) objectBindings.push({ imageHash: sourceHash, objectKey: `bench/scientific-v2/private/objects/${sourceHash}.png` })
  return { objectBindings, evidence }
}

test('A/B import treats score gap, red-line conflict or low confidence as dispute and requires HMAC xhigh arbitration', async () => {
  const fixture = scientificBatchFixture()
  const state = completedScientificState(fixture)
  const storage = atomicScientificDb()
  const secret = 'scientific-v2-review-secret-at-least-32-bytes'
  const repository = createScientificV2MongoRepository(storage.db, () => FIXED_NOW, () => 'review-claim-token-2', { operatorReportSecret: secret })
  await repository.freezeBatch({ batchId: 'scientific-v2-review-dispute', ...fixture })
  const imported = signedStateReport(secret, fixture, state)
  imported.report.batchId = 'scientific-v2-review-dispute'
  resignStateReport(imported, secret)
  await repository.importStateReport(imported)
  const assignments = reviewAssignments(secret, fixture, state)
  const bindingsFor = (assignment: any) => assignment.packages.flatMap((packet: any) => packet.items.map((item: any) => ({ imageHash: item.imageHash, objectKey: `bench/scientific-v2/private/objects/${item.imageHash}.png` })))
  await repository.exportReviewAssignment({ batchId: 'scientific-v2-review-dispute', assignment: assignments.A, objectBindings: bindingsFor(assignments.A) })
  await repository.exportReviewAssignment({ batchId: 'scientific-v2-review-dispute', assignment: assignments.B, objectBindings: bindingsFor(assignments.B) })
  await assert.rejects(
    () => repository.importReviewResult({ batchId: 'scientific-v2-review-dispute', result: signedReviewerResult(secret, assignments.A, 5, ['private/path/blind-A']) }),
    /SCIENTIFIC_V2_REVIEW_REDLINE_INVALID/,
  )
  await repository.importReviewResult({ batchId: 'scientific-v2-review-dispute', result: signedReviewerResult(secret, assignments.A, 5, ['scientific_inaccuracy']) })

  const disputed = await repository.importReviewResult({ batchId: 'scientific-v2-review-dispute', result: signedReviewerResult(secret, assignments.B, 8, ['scientific_inaccuracy']) })

  assert.equal(disputed.status, 'dispute')
  assert.deepEqual((disputed as any).disputes[0].reasons, ['score_gap_gt_2'])
  const arbitrationBase = {
    reasoningEffort: 'xhigh',
    batchManifestHash: fixture.manifest.manifestHash,
    sourceSetHash: assignments.A.privateEnvelope.sourceSetHash,
    results: [{ itemHash: assignments.A.packages[0].items[0].itemHash, scores: Object.fromEntries(assignments.A.packages[0].items[0].applicableAxes.map((axis: string) => [axis, 7])), redLines: ['scientific_inaccuracy'] }],
  }
  const arbitrationHash = canonicalHash(arbitrationBase)
  const arbitrationInput = {
    batchId: 'scientific-v2-review-dispute', arbitration: arbitrationBase, arbitrationHash,
    attestationHash: createHmac('sha256', secret).update(arbitrationHash).digest('hex'),
  }
  storage.failNextArbitrationBatchCas()
  await assert.rejects(() => repository.importArbitration(arbitrationInput), /SCIENTIFIC_V2_REVIEW_FINAL_CONFLICT/)
  assert.equal((storage.rows.get('paperbanana_benchmark_scientific_v2_review_artifacts') || []).some((row) => row.artifactType === 'review_arbitration'), false)
  assert.equal((storage.rows.get('paperbanana_benchmark_scientific_v2_review_artifacts') || []).find((row) => row.artifactType === 'review_final')?.status, 'dispute')
  assert.equal(storage.rows.get('paperbanana_benchmark_scientific_v2_batches')?.[0].status, 'review_dispute')
  storage.clearArbitrationBatchFailure()
  const finalized = await repository.importArbitration({
    ...arbitrationInput,
  })
  assert.equal(finalized.status, 'finalized')
  assert.equal(finalized.automaticJudgeCalls, 0)
  assert.equal(finalized.results[0].resolution, 'xhigh_arbitration')
  assert.equal(storage.rows.get('paperbanana_benchmark_scientific_v2_batches')?.[0].status, 'review_ready')
  assert.equal((await repository.importArbitration(arbitrationInput) as any).replayed, true)
})

test('publishScientificV2 recomputes all frozen models and atomically writes one immutable release', async () => {
  const fixture = scientificBatchFixture()
  const state = completedScientificState(fixture)
  const storage = atomicScientificDb()
  const verified: Array<[string, string]> = []
  const secret = 'scientific-v2-publish-secret-at-least-32-bytes'
  const repository = createScientificV2MongoRepository(storage.db, () => FIXED_NOW, () => 'publish-claim-token', {
    operatorReportSecret: secret,
    immutableCodeSha: fixture.manifest.codeSha,
    verifyObject: async (objectKey, imageHash) => { verified.push([objectKey, imageHash]) },
  })
  await repository.freezeBatch({ batchId: 'scientific-v2-publish-batch', ...fixture })
  const input = await preparePublishFacts(repository, fixture, state, secret, 'scientific-v2-publish-batch')

  const published = await repository.publishScientificV2({ batchId: 'scientific-v2-publish-batch', ...input })

  assert.equal(published.profileStatus, 'published')
  assert.equal(storage.rows.get('paperbanana_benchmark_releases')?.length, 1)
  const release = storage.rows.get('paperbanana_benchmark_releases')![0]
  assert.equal(release.models.length, fixture.manifest.models.length)
  assert.ok(release.models.every((model: any) => model.evidence.length === 9))
  assert.deepEqual(release.methodology.automaticJudges, [])
  assert.equal(release.methodology.automaticJudgmentCount, 0)
  assert.equal(release.manifestCodeSha, fixture.manifest.codeSha)
  assert.equal(release.executionCodeSha, fixture.manifest.codeSha)
  assert.equal(release.publicationCodeSha, fixture.manifest.codeSha)
  assert.equal(release.legacyRecovery, false)
  assert.equal(release.methodology.manifestCodeSha, fixture.manifest.codeSha)
  assert.equal(release.methodology.executionCodeSha, fixture.manifest.codeSha)
  assert.equal(release.methodology.publicationCodeSha, fixture.manifest.codeSha)
  assert.equal(release.methodology.legacyRecovery, false)
  assert.equal('codeSha' in release, false)
  assert.equal('stateHash' in release, false)
  assert.ok(verified.length >= state.slots.length)

  const stateReport = (storage.rows.get('paperbanana_benchmark_scientific_v2_review_artifacts') || []).find((row) => row.artifactType === 'state_report')
  const assignmentA = (storage.rows.get('paperbanana_benchmark_scientific_v2_review_artifacts') || []).find((row) => row.artifactType === 'review_assignment_private' && row.role === 'A')
  assert.equal((await repository.importStateReport({ report: stateReport.report, reportHash: stateReport.reportHash, attestationHash: stateReport.attestationHash })).replayed, true)
  assert.equal((await repository.importReviewResult({ batchId: 'scientific-v2-publish-batch', result: assignmentA.result }) as any).replayed, true)
  await assert.rejects(
    () => repository.importReviewResult({ batchId: 'scientific-v2-publish-batch', result: signedFullReviewerResult(secret, assignmentA.assignment, 7) }),
    /SCIENTIFIC_V2_REVIEW_RESULT_CONFLICT/,
  )
})

test('publish accepts only an exact zero-provider unknown reconciliation audit chain', async () => {
  const fixture = scientificBatchFixture()
  const { state, slotId } = completedStateWithAuditedUnknownFailures(fixture)
  const secret = 'scientific-v2-publish-unknown-audit-secret-32-bytes'

  const acceptedStorage = atomicScientificDb()
  const accepted = createScientificV2MongoRepository(acceptedStorage.db, () => FIXED_NOW, () => 'publish-unknown-audit', {
    operatorReportSecret: secret, immutableCodeSha: fixture.manifest.codeSha, verifyObject: async () => {},
  })
  await accepted.freezeBatch({ batchId: 'scientific-v2-publish-unknown-audit', ...fixture })
  const acceptedInput = await preparePublishFacts(accepted, fixture, state, secret, 'scientific-v2-publish-unknown-audit')
  replaceDispatchesWithAuditedUnknowns(acceptedStorage, fixture, state, slotId)
  const published = await accepted.publishScientificV2({ batchId: 'scientific-v2-publish-unknown-audit', ...acceptedInput })
  assert.equal(published.profileStatus, 'published')

  const rejectedStorage = atomicScientificDb()
  const rejected = createScientificV2MongoRepository(rejectedStorage.db, () => FIXED_NOW, () => 'publish-unknown-audit-tamper', {
    operatorReportSecret: secret, immutableCodeSha: fixture.manifest.codeSha, verifyObject: async () => {},
  })
  await rejected.freezeBatch({ batchId: 'scientific-v2-publish-unknown-audit-tamper', ...fixture })
  const rejectedInput = await preparePublishFacts(rejected, fixture, state, secret, 'scientific-v2-publish-unknown-audit-tamper')
  replaceDispatchesWithAuditedUnknowns(rejectedStorage, fixture, state, slotId)
  const audit = (rejectedStorage.rows.get('paperbanana_benchmark_scientific_v2_review_artifacts') || [])
    .find((row: any) => row.artifactType === 'unknown_reconciliation')!
  audit.evidence.candidateCount = 1
  const auditBase = Object.fromEntries([
    'schemaVersion', 'kind', 'manifestHash', 'previousStateHash', 'stateHash', 'slotId', 'sequence',
    'originalAttempt', 'reconciledAttempt', 'evidence',
  ].map((key) => [key, structuredClone(audit[key])]))
  audit.auditHash = canonicalHash(auditBase)
  await assert.rejects(
    () => rejected.publishScientificV2({ batchId: 'scientific-v2-publish-unknown-audit-tamper', ...rejectedInput }),
    /SCIENTIFIC_V2_DISPATCH_LEDGER_MISMATCH/,
  )
})

test('publish independently rejects dual-SHA lineage tampering after review finalization', async () => {
  const fixture = scientificBatchFixture()
  const state = completedScientificState(fixture)
  const storage = atomicScientificDb()
  const secret = 'scientific-v2-publish-lineage-secret-at-least-32-bytes'
  const batchId = 'scientific-v2-publish-lineage-tamper'
  const repository = createScientificV2MongoRepository(storage.db, () => FIXED_NOW, () => 'publish-lineage-tamper', {
    operatorReportSecret: secret, immutableCodeSha: fixture.manifest.codeSha, verifyObject: async () => {},
  })
  await repository.freezeBatch({ batchId, ...fixture })
  const input = await preparePublishFacts(repository, fixture, state, secret, batchId)
  const batch = storage.rows.get('paperbanana_benchmark_scientific_v2_batches')![0]
  batch.executionCodeSha = 'b'.repeat(40)

  await assert.rejects(
    () => repository.publishScientificV2({ batchId, ...input }),
    /SCIENTIFIC_V2_CODE_LINEAGE_INVALID/,
  )
  assert.equal(storage.rows.get('paperbanana_benchmark_releases')?.length || 0, 0)
})

test('reviewed batch publication preserves frozen execution SHA and records the newer publisher SHA', async () => {
  const fixture = scientificBatchFixture()
  const state = completedScientificState(fixture)
  const storage = atomicScientificDb()
  const secret = 'scientific-v2-publisher-lineage-secret-at-least-32-bytes'
  const batchId = 'scientific-v2-publisher-lineage'
  const frozen = createScientificV2MongoRepository(storage.db, () => FIXED_NOW, () => 'publisher-lineage-frozen', {
    operatorReportSecret: secret, immutableCodeSha: fixture.manifest.codeSha, verifyObject: async () => {},
  })
  await frozen.freezeBatch({ batchId, ...fixture })
  const input = await preparePublishFacts(frozen, fixture, state, secret, batchId)
  const publicationCodeSha = 'b'.repeat(40)
  const publisher = createScientificV2MongoRepository(storage.db, () => FIXED_NOW, () => 'publisher-lineage-current', {
    operatorReportSecret: secret, immutableCodeSha: publicationCodeSha, verifyObject: async () => {},
  })

  await publisher.publishScientificV2({ batchId, ...input })

  const release = storage.rows.get('paperbanana_benchmark_releases')![0]
  assert.equal(release.manifestCodeSha, fixture.manifest.codeSha)
  assert.equal(release.executionCodeSha, fixture.manifest.codeSha)
  assert.equal(release.publicationCodeSha, publicationCodeSha)
  assert.equal(release.methodology.publicationCodeSha, publicationCodeSha)
})

test('publish exposes fixed legacy recovery lineage without exposing an internal state hash', async () => {
  const fixture = scientificBatchFixture()
  const state = completedScientificState(fixture)
  const storage = atomicScientificDb()
  const secret = 'scientific-v2-legacy-release-secret-at-least-32-bytes'
  const batchId = 'scientific-v2-legacy-recovery-release'
  const original = createScientificV2MongoRepository(storage.db, () => FIXED_NOW)
  await original.freezeBatch({ batchId, ...fixture })
  const batch = storage.rows.get('paperbanana_benchmark_scientific_v2_batches')![0]
  const blocked = blockedProviderCanaryState(fixture)
  batch.state = structuredClone(blocked)
  batch.stateHash = blocked.stateHash
  batch.status = 'blocked'
  const executionCodeSha = 'b'.repeat(40)
  const recovery = createScientificV2MongoRepository(storage.db, () => FIXED_NOW, () => 'legacy-release-recovery', {
    operatorReportSecret: secret, immutableCodeSha: executionCodeSha, verifyObject: async () => {},
  })
  const attestation = await recovery.operatorAttestation({ batchId })
  batch.state = structuredClone(fixture.initialState)
  batch.stateHash = fixture.initialState.stateHash
  batch.stateTransitionFromHash = null
  batch.status = 'frozen'
  batch.revision = 0

  const input = await preparePublishFacts(recovery, fixture, state, secret, batchId, {
    lineage: {
      manifestCodeSha: attestation.manifestCodeSha,
      executionCodeSha: attestation.executionCodeSha,
      legacyRecoveryStateHash: attestation.legacyRecoveryStateHash,
    },
  })
  await recovery.publishScientificV2({ batchId, ...input })

  const release = storage.rows.get('paperbanana_benchmark_releases')![0]
  assert.equal(release.manifestCodeSha, fixture.manifest.codeSha)
  assert.equal(release.executionCodeSha, executionCodeSha)
  assert.equal(release.publicationCodeSha, executionCodeSha)
  assert.equal(release.legacyRecovery, true)
  assert.equal(release.methodology.legacyRecovery, true)
  assert.equal('codeSha' in release, false)
  assert.equal('stateHash' in release, false)
})

test('Codex terminal import and publish allow later failed slots while deriving actual successes and all tool calls', async () => {
  const fixture = scientificBatchFixture()
  const state = completedStateWithOneLaterCodexFailure(fixture)
  const storage = atomicScientificDb()
  const secret = 'scientific-v2-partial-codex-secret-at-least-32-bytes'
  const repository = createScientificV2MongoRepository(storage.db, () => FIXED_NOW, () => 'partial-codex-token', {
    operatorReportSecret: secret, verifyObject: async () => {},
  })
  await repository.freezeBatch({ batchId: 'scientific-v2-partial-codex', ...fixture })
  const input = await preparePublishFacts(repository, fixture, state, secret, 'scientific-v2-partial-codex')

  await repository.publishScientificV2({ batchId: 'scientific-v2-partial-codex', ...input })

  const release = storage.rows.get('paperbanana_benchmark_releases')![0]
  const codexModel = release.models.find((model: any) => model.canonicalModelId === 'codex:gpt-image-2')
  assert.equal(codexModel.attemptSummary.succeeded, 8)
  assert.equal(codexModel.attemptSummary.failed, 1)
  const failedEvidence = codexModel.evidence.find((item: any) => item.status === 'failed')
  assert.equal(failedEvidence.attemptSummary.count, 4)
  assert.equal('variants' in failedEvidence, false)
})

test('publish accepts the review_ready terminal produced by transactional arbitration', async () => {
  const fixture = scientificBatchFixture()
  const state = completedScientificState(fixture)
  const storage = atomicScientificDb()
  const secret = 'scientific-v2-arbitrated-publish-secret-32-bytes'
  const repository = createScientificV2MongoRepository(storage.db, () => FIXED_NOW, () => 'arbitrated-publish-token', {
    operatorReportSecret: secret, verifyObject: async () => {},
  })
  await repository.freezeBatch({ batchId: 'scientific-v2-arbitrated-publish', ...fixture })
  const input = await preparePublishFacts(repository, fixture, state, secret, 'scientific-v2-arbitrated-publish', { dispute: true })

  const published = await repository.publishScientificV2({ batchId: 'scientific-v2-arbitrated-publish', ...input })

  assert.equal(published.profileStatus, 'published')
})

test('publishScientificV2 rolls back release and public evidence when batch CAS fails after insert', async () => {
  const fixture = scientificBatchFixture()
  const state = completedScientificState(fixture)
  const storage = atomicScientificDb()
  const secret = 'scientific-v2-publish-secret-at-least-32-bytes'
  const repository = createScientificV2MongoRepository(storage.db, () => FIXED_NOW, () => 'publish-rollback-token', {
    operatorReportSecret: secret,
    verifyObject: async () => {},
  })
  await repository.freezeBatch({ batchId: 'scientific-v2-publish-rollback', ...fixture })
  const input = await preparePublishFacts(repository, fixture, state, secret, 'scientific-v2-publish-rollback')
  storage.failNextPublishBatchCas()

  await assert.rejects(() => repository.publishScientificV2({ batchId: 'scientific-v2-publish-rollback', ...input }), /SCIENTIFIC_V2_PUBLISH_STATE_CONFLICT/)
  assert.equal(storage.rows.get('paperbanana_benchmark_releases')?.length || 0, 0)
  assert.equal(storage.rows.get('paperbanana_benchmark_scientific_v2_public_evidence')?.length || 0, 0)
})

test('only an exact remediation batch atomically supersedes the active Scientific V2 release outside its content hash', async () => {
  const firstFixture = scientificBatchFixture()
  const secondFixture = structuredClone(firstFixture)
  secondFixture.manifest.codeSha = 'b'.repeat(40)
  const rehashedSecondFixture = rehashFreezeFixture(secondFixture)
  const storage = atomicScientificDb()
  const secret = 'scientific-v2-remediation-supersede-secret-32-bytes'
  const firstBatchId = 'scientific-v2-supersede-first'
  const secondBatchId = 'scientific-v2-supersede-second'
  const first = createScientificV2MongoRepository(storage.db, () => FIXED_NOW, () => 'supersede-first', {
    operatorReportSecret: secret, immutableCodeSha: firstFixture.manifest.codeSha, verifyObject: async () => {},
  })
  await first.freezeBatch({ batchId: firstBatchId, ...firstFixture })
  const firstInput = await preparePublishFacts(first, firstFixture, completedScientificState(firstFixture), secret, firstBatchId)
  const publishedFirst = await first.publishScientificV2({ batchId: firstBatchId, ...firstInput })
  const firstReleaseBefore = structuredClone(storage.rows.get('paperbanana_benchmark_releases')![0])

  const second = createScientificV2MongoRepository(storage.db, () => new Date('2026-09-01T00:00:00.000Z'), () => 'supersede-second', {
    operatorReportSecret: secret, immutableCodeSha: rehashedSecondFixture.manifest.codeSha, verifyObject: async () => {},
  })
  await second.freezeBatch({ batchId: secondBatchId, ...rehashedSecondFixture })
  const secondInput = await preparePublishFacts(second, rehashedSecondFixture, completedScientificState(rehashedSecondFixture), secret, secondBatchId)
  await assert.rejects(
    () => second.publishScientificV2({ batchId: secondBatchId, ...secondInput }),
    /SCIENTIFIC_V2_RELEASE_IDENTITY_CONFLICT/,
  )
  const secondBatch = storage.rows.get('paperbanana_benchmark_scientific_v2_batches')!
    .find((row) => row.batchId === secondBatchId)!
  secondBatch.remediationOf = {
    batchId: firstBatchId,
    manifestHash: firstReleaseBefore.batchManifestHash,
    releaseId: firstReleaseBefore._id,
    releaseHash: publishedFirst.releaseHash,
    targetModelIds: [firstReleaseBefore.models[0].canonicalModelId],
    targetSlotIds: [`${firstReleaseBefore.models[0].canonicalModelId}:scientific-gen-01-method-flow`],
    targetSlotSetHash: canonicalHash([`${firstReleaseBefore.models[0].canonicalModelId}:scientific-gen-01-method-flow`]),
  }

  const publishedSecond = await second.publishScientificV2({ batchId: secondBatchId, ...secondInput })
  assert.notEqual(publishedSecond.releaseHash, publishedFirst.releaseHash)
  assert.equal(storage.rows.get('paperbanana_benchmark_releases')?.length, 2)
  assert.deepEqual(storage.rows.get('paperbanana_benchmark_releases')![0], firstReleaseBefore)
  const { _id: _firstId, releaseHash: firstHash, ...firstReleaseBase } = firstReleaseBefore
  assert.equal(canonicalHash(firstReleaseBase), firstHash)
  const lifecycle = storage.rows.get('paperbanana_benchmark_release_lifecycle') || []
  assert.equal(lifecycle.find((row) => row.releaseId === firstReleaseBefore._id)?.status, 'superseded')
  assert.equal(lifecycle.find((row) => row.releaseHash === publishedSecond.releaseHash)?.status, 'active')
  const publicRepository = createMongoBenchmarkRepository(storage.db, () => new Date('2026-09-01T00:00:00.000Z'), async () => {})
  assert.equal((await publicRepository.latestRelease())?.releaseHash, publishedSecond.releaseHash)
  assert.equal((await publicRepository.releaseByModel('', '', '', firstReleaseBefore.models[0].profileId))?.releaseHash, publishedSecond.releaseHash)
})

test('Scientific V2 remediation supersede rolls back release, evidence, head and lifecycle on final batch CAS failure', async () => {
  const firstFixture = scientificBatchFixture()
  const secondFixture = structuredClone(firstFixture)
  secondFixture.manifest.codeSha = 'b'.repeat(40)
  const rehashedSecondFixture = rehashFreezeFixture(secondFixture)
  const storage = atomicScientificDb()
  const secret = 'scientific-v2-remediation-rollback-secret-32-bytes'
  const first = createScientificV2MongoRepository(storage.db, () => FIXED_NOW, () => 'remediation-rollback-first', {
    operatorReportSecret: secret, immutableCodeSha: firstFixture.manifest.codeSha, verifyObject: async () => {},
  })
  await first.freezeBatch({ batchId: 'scientific-v2-remediation-rollback-first', ...firstFixture })
  const firstInput = await preparePublishFacts(first, firstFixture, completedScientificState(firstFixture), secret, 'scientific-v2-remediation-rollback-first')
  const publishedFirst = await first.publishScientificV2({ batchId: 'scientific-v2-remediation-rollback-first', ...firstInput })
  const firstRelease = storage.rows.get('paperbanana_benchmark_releases')![0]

  const second = createScientificV2MongoRepository(storage.db, () => new Date('2026-09-01T00:00:00.000Z'), () => 'remediation-rollback-second', {
    operatorReportSecret: secret, immutableCodeSha: rehashedSecondFixture.manifest.codeSha, verifyObject: async () => {},
  })
  await second.freezeBatch({ batchId: 'scientific-v2-remediation-rollback-second', ...rehashedSecondFixture })
  const secondInput = await preparePublishFacts(second, rehashedSecondFixture, completedScientificState(rehashedSecondFixture), secret, 'scientific-v2-remediation-rollback-second')
  const secondBatch = storage.rows.get('paperbanana_benchmark_scientific_v2_batches')!
    .find((row) => row.batchId === 'scientific-v2-remediation-rollback-second')!
  const targetSlotIds = [`${firstRelease.models[0].canonicalModelId}:scientific-gen-01-method-flow`]
  secondBatch.remediationOf = {
    batchId: 'scientific-v2-remediation-rollback-first', manifestHash: firstRelease.batchManifestHash,
    releaseId: firstRelease._id, releaseHash: publishedFirst.releaseHash,
    targetModelIds: [firstRelease.models[0].canonicalModelId], targetSlotIds,
    targetSlotSetHash: canonicalHash(targetSlotIds),
  }
  storage.failNextPublishBatchCas()

  await assert.rejects(
    () => second.publishScientificV2({ batchId: secondBatch.batchId, ...secondInput }),
    /SCIENTIFIC_V2_PUBLISH_STATE_CONFLICT/,
  )
  assert.equal(storage.rows.get('paperbanana_benchmark_releases')?.length, 1)
  const head = storage.rows.get('paperbanana_benchmark_release_heads')![0]
  assert.equal(head.releaseId, firstRelease._id)
  assert.equal(head.releaseHash, publishedFirst.releaseHash)
  const lifecycle = storage.rows.get('paperbanana_benchmark_release_lifecycle') || []
  assert.equal(lifecycle.length, 1)
  assert.equal(lifecycle[0].releaseId, firstRelease._id)
  assert.equal(lifecycle[0].status, 'active')
})

test('freezeBatch matches Worker exact-schema rejection for every frozen document layer', async (t) => {
  const cases: Array<[string, (fixture: any) => void, 'manifest' | 'state']> = [
    ['manifest extra key', (fixture) => { fixture.manifest.extra = true }, 'manifest'],
    ['registry snapshot extra key', (fixture) => { fixture.registrySnapshot.extra = true }, 'manifest'],
    ['price snapshot extra key', (fixture) => { fixture.manifest.priceSnapshot.extra = true }, 'manifest'],
    ['price entry extra key', (fixture) => {
      fixture.manifest.priceSnapshot.entries[0].extra = true
      const { entryHash: _entryHash, ...entryBase } = fixture.manifest.priceSnapshot.entries[0]
      fixture.manifest.priceSnapshot.entries[0].entryHash = canonicalHash(entryBase)
    }, 'manifest'],
    ['initial state extra key', (fixture) => { fixture.initialState.extra = true }, 'state'],
    ['state slot extra key', (fixture) => { fixture.initialState.slots[0].extra = true }, 'state'],
    ['execution slot extra key', (fixture) => {
      fixture.manifest.executionOrder[0].extra = true
      fixture.initialState.slots[0].extra = true
    }, 'manifest'],
  ]
  for (const [name, mutate, workerLayer] of cases) await t.test(name, async () => {
    const fixture: any = scientificBatchFixture()
    mutate(fixture)
    const rehashed = rehashFreezeFixture(fixture)
    assert.throws(
      () => workerLayer === 'manifest'
        ? verifyWorkerScientificV2BatchManifest(rehashed.manifest as any)
        : verifyWorkerScientificV2BatchState(rehashed.initialState as any, rehashed.manifest as any),
      /SCIENTIFIC_V2_/,
    )
    const storage = atomicScientificDb()
    const repository = createScientificV2MongoRepository(storage.db, () => FIXED_NOW)
    await assert.rejects(
      () => repository.freezeBatch({ batchId: `exact-${name.replaceAll(' ', '-')}`, ...rehashed }),
      /SCIENTIFIC_V2_/,
    )
  })
})

test('import accepts an exact failed provider canary attested as passed false and rejects a dishonest boolean', async () => {
  const fixture = scientificBatchFixture()
  const state = propagatedProviderCanaryFailureState(fixture)
  assert.doesNotThrow(() => verifyScientificV2ImportedState(state, fixture.manifest))
  const storage = atomicScientificDb()
  const secret = 'scientific-v2-failed-canary-secret-32-bytes'
  const repository = createScientificV2MongoRepository(storage.db, () => FIXED_NOW, () => 'failed-canary-api', { operatorReportSecret: secret })
  await repository.freezeBatch({ batchId: 'scientific-v2-failed-canary', ...fixture })
  const signed = signedStateReport(secret, fixture, state, 'codex', { batchId: 'scientific-v2-failed-canary' })
  assert.equal(signed.report.providerCanaryAttestation.passed, false)
  assert.equal((await repository.importStateReport(signed)).reviewReady, true)

  const dishonestStorage = atomicScientificDb()
  const dishonestRepository = createScientificV2MongoRepository(dishonestStorage.db, () => FIXED_NOW, () => 'dishonest-canary-api', { operatorReportSecret: secret })
  await dishonestRepository.freezeBatch({ batchId: 'scientific-v2-dishonest-canary', ...fixture })
  const dishonest = signedStateReport(secret, fixture, state, 'codex', {
    batchId: 'scientific-v2-dishonest-canary', providerCanaryPassed: true,
  })
  await assert.rejects(() => dishonestRepository.importStateReport(dishonest), /SCIENTIFIC_V2_OPERATION_ATTESTATION_INVALID/)
})

test('Codex provenance binds the first canary slot final successful attempt hash', async () => {
  const fixture = scientificBatchFixture()
  const state = codexCanaryWithRetry(completedScientificState(fixture))
  const storage = atomicScientificDb()
  const secret = 'scientific-v2-codex-final-canary-32-bytes'
  const repository = createScientificV2MongoRepository(storage.db, () => FIXED_NOW, () => 'codex-final-canary', { operatorReportSecret: secret })
  await repository.freezeBatch({ batchId: 'scientific-v2-codex-final-canary', ...fixture })
  const signed = signedStateReport(secret, fixture, state, 'codex', { batchId: 'scientific-v2-codex-final-canary' })
  const imported = await repository.importStateReport(signed)
  assert.equal(imported.reviewReady, true)
  assert.equal(signed.report.codexProvenance?.artifactCanaryHash, state.slots.find((slot: any) => slot.provider === 'codex').attempts.at(-1).rawImageHash)
})

test('publish audits only the failed canary route as zero and preserves both adjacent route identities', async () => {
  const fixture = scientificBatchFixture({ secondBailianModel: true, splitCanonicalAcrossProviders: true })
  const state = propagatedProviderCanaryFailureState(fixture)
  const storage = atomicScientificDb()
  const secret = 'scientific-v2-publish-canary-secret-at-least-32-bytes'
  const batchId = 'scientific-v2-publish-failed-canary'
  const repository = createScientificV2MongoRepository(storage.db, () => FIXED_NOW, () => 'publish-failed-canary', {
    operatorReportSecret: secret, verifyObject: async () => {},
  })
  await repository.freezeBatch({ batchId, ...fixture })
  const input = await preparePublishFacts(repository, fixture, state, secret, batchId)
  await repository.publishScientificV2({ batchId, ...input })

  const release = storage.rows.get('paperbanana_benchmark_releases')![0]
  const canary = state.slots.find((slot: any) => slot.isProviderCanary && slot.status === 'failed')!
  const model = release.models.find((candidate: any) => candidate.canonicalModelId === canary.canonicalModelId)!
  assert.ok(Object.values(model.scores).some((score) => Number(score) > 0))
  assert.deepEqual(model.attemptSummary, { total: 7, succeeded: 3, failed: 6, unsupported: 0 })
  assert.equal(model.evidence.find((item: any) => item.caseId === canary.caseId).failureReason, 'confirmed_attempts_exhausted')
  const propagatedCaseIds = new Set(state.slots.filter((slot: any) => slot.provider === canary.provider
    && slot.canonicalModelId === canary.canonicalModelId && slot.slotId !== canary.slotId).map((slot: any) => slot.caseId))
  assert.ok(model.evidence.filter((item: any) => propagatedCaseIds.has(item.caseId))
    .every((item: any) => item.failureReason === 'provider_canary_confirmed_failed'
      && item.attemptSummary.count === 0 && item.attemptSummary.responseClasses.length === 0))
  const otherProviderSlots = state.slots.filter((slot: any) => slot.provider !== canary.provider
    && slot.canonicalModelId === canary.canonicalModelId)
  assert.equal(otherProviderSlots.length, 3)
  assert.ok(otherProviderSlots.every((slot: any) => slot.status === 'succeeded' && slot.attempts.length === 1))
  assert.ok(model.evidence.filter((item: any) => otherProviderSlots.some((slot: any) => slot.caseId === item.caseId))
    .every((item: any) => item.failureReason === undefined && item.attemptSummary.count === 1))
  const sameProviderModel = release.models.find((candidate: any) => candidate.canonicalModelId !== canary.canonicalModelId
    && state.slots.some((slot: any) => slot.canonicalModelId === candidate.canonicalModelId && slot.provider === canary.provider))!
  assert.ok(Object.values(sameProviderModel.scores).some((score) => Number(score) > 0))
  assert.deepEqual(sameProviderModel.attemptSummary, { total: 9, succeeded: 9, failed: 0, unsupported: 0 })
  const markers = storage.rows.get('paperbanana_benchmark_scientific_v2_dispatches') || []
  assert.equal(markers.filter((marker) => marker.slotId === canary.slotId && marker.status === 'committed').length, 4)
  assert.equal(markers.filter((marker) => otherProviderSlots.some((slot: any) => slot.slotId === marker.slotId)
    && marker.status === 'committed').length, 3)
  assert.equal(markers.filter((marker) => state.slots.some((slot: any) => slot.canonicalModelId === sameProviderModel.canonicalModelId
    && slot.slotId === marker.slotId) && marker.status === 'committed').length, 9)
})

test('publish requires exact private raw/source keys and exact public rendition key by kind', async (t) => {
  const cases: Array<[string, (input: any) => void]> = [
    ['raw binding prefix', (input) => { input.objectBindings[0].objectKey = `bench/scientific-v2/private/other/${input.objectBindings[0].imageHash}.png` }],
    ['source binding prefix', (input) => {
      const source = input.objectBindings.find((binding: any) => binding.imageHash === PB_SCIENTIFIC_FIGURE_V2.cases.find((item) => item.kind === 'edit')!.sourceHash)
      source.objectKey = `bench/scientific-v2/source/${source.imageHash}.png`
    }],
    ['rendition nested suffix', (input) => { input.evidence[0].variants[0].objectKey = `${input.evidence[0].variants[0].objectKey.replace('/detail.webp', '')}/nested/detail.webp` }],
    ['duplicate rendition kind', (input) => { input.evidence[0].variants.push(structuredClone(input.evidence[0].variants[0])) }],
  ]
  for (const [name, mutate] of cases) await t.test(name, async () => {
    const fixture = scientificBatchFixture()
    const state = completedScientificState(fixture)
    const storage = atomicScientificDb()
    const secret = `scientific-v2-object-${name}-secret-at-least-32-bytes`
    const repository = createScientificV2MongoRepository(storage.db, () => FIXED_NOW, () => `object-${name}`, { operatorReportSecret: secret, verifyObject: async () => {} })
    await repository.freezeBatch({ batchId: `scientific-v2-object-${name.replaceAll(' ', '-')}`, ...fixture })
    const input = await preparePublishFacts(repository, fixture, state, secret, `scientific-v2-object-${name.replaceAll(' ', '-')}`)
    mutate(input)
    await assert.rejects(() => repository.publishScientificV2({ batchId: `scientific-v2-object-${name.replaceAll(' ', '-')}`, ...input }), /SCIENTIFIC_V2_(?:OBJECT_BINDING|PUBLIC_VARIANT)_INVALID/)
  })
})

test('second review result finalization is one transaction and exact replay never drifts revision', async () => {
  const fixture = scientificBatchFixture()
  const state = completedScientificState(fixture)
  const storage = atomicScientificDb()
  const secret = 'scientific-v2-review-final-transaction-32-bytes'
  const batchId = 'scientific-v2-review-final-transaction'
  const repository = createScientificV2MongoRepository(storage.db, () => FIXED_NOW, () => 'review-final-transaction', { operatorReportSecret: secret })
  await repository.freezeBatch({ batchId, ...fixture })
  await repository.importStateReport(signedStateReport(secret, fixture, state, 'codex', { batchId }))
  const assignments = fullReviewAssignments(secret, fixture, state)
  const bindings = (assignment: any) => assignment.packages.flatMap((packet: any) => packet.items.map((item: any) => ({
    imageHash: item.imageHash, objectKey: `bench/scientific-v2/private/objects/${item.imageHash}.png`,
  })))
  await repository.exportReviewAssignment({ batchId, assignment: assignments.A, objectBindings: bindings(assignments.A) })
  await repository.exportReviewAssignment({ batchId, assignment: assignments.B, objectBindings: bindings(assignments.B) })
  const resultA = signedFullReviewerResult(secret, assignments.A)
  const resultB = signedFullReviewerResult(secret, assignments.B)
  await repository.importReviewResult({ batchId, result: resultA })
  const awaitingRevision = storage.rows.get('paperbanana_benchmark_scientific_v2_batches')![0].revision
  const awaitingReplay = await repository.importReviewResult({ batchId, result: resultA }) as any
  assert.equal(awaitingReplay.replayed, true)
  assert.equal(storage.rows.get('paperbanana_benchmark_scientific_v2_batches')![0].revision, awaitingRevision)
  const before = structuredClone(storage.rows.get('paperbanana_benchmark_scientific_v2_batches')![0])
  storage.failNextReviewFinalBatchCas()
  await assert.rejects(() => repository.importReviewResult({ batchId, result: resultB }), /SCIENTIFIC_V2_REVIEW_FINAL_CONFLICT/)
  assert.equal((storage.rows.get('paperbanana_benchmark_scientific_v2_review_artifacts') || []).some((row) => row.artifactType === 'review_final'), false)
  assert.equal((storage.rows.get('paperbanana_benchmark_scientific_v2_review_artifacts') || []).find((row) => row.role === 'B')?.result, undefined)
  assert.equal(storage.rows.get('paperbanana_benchmark_scientific_v2_batches')![0].revision, before.revision)
  storage.clearReviewFinalBatchFailure()
  storage.loseNextCommitAck()
  await assert.rejects(() => repository.importReviewResult({ batchId, result: resultB }), /SIMULATED_ACK_LOSS/)
  const revision = storage.rows.get('paperbanana_benchmark_scientific_v2_batches')![0].revision
  const replay = await repository.importReviewResult({ batchId, result: resultB }) as any
  assert.equal(replay.status, 'finalized')
  assert.equal(replay.replayed, true)
  assert.equal(storage.rows.get('paperbanana_benchmark_scientific_v2_batches')![0].revision, revision)
})

test('publicEvidenceForRelease routes scientific releases to the V2 collection and preserves V1 collection behavior', async () => {
  const releases = [
    { releaseHash: 'a'.repeat(64), evaluationMode: 'codex_scientific_v2' },
    { releaseHash: 'b'.repeat(64), evaluationMode: 'codex_single' },
  ]
  const rows = new Map<string, any[]>([
    ['paperbanana_benchmark_releases', releases],
    ['paperbanana_benchmark_public_evidence', [{ sourceReleaseHash: 'b'.repeat(64), profileId: 'v1', caseId: 'v1-case', overallRank: 1, sampleId: 'v1-sample' }]],
    ['paperbanana_benchmark_scientific_v2_public_evidence', [{ sourceReleaseHash: 'a'.repeat(64), profileId: 'v2', caseId: 'scientific-gen-01-method-flow', overallRank: 1 }]],
  ])
  const collection = (name: string) => ({
    async findOne(query: any) { return (rows.get(name) || []).find((row) => matches(row, query)) || null },
    find(query: any) {
      let selected = (rows.get(name) || []).filter((row) => matches(row, query))
      const cursor: any = {
        sort() { return cursor }, skip(offset: number) { selected = selected.slice(offset); return cursor },
        limit(limit: number) { selected = selected.slice(0, limit); return cursor }, async toArray() { return structuredClone(selected) },
      }
      return cursor
    },
  })
  const repository = createMongoBenchmarkRepository({ collection, client: { startSession() { throw new Error('unused') } } } as any)
  assert.equal((await repository.publicEvidenceForRelease('a'.repeat(64), { limit: 12 })).items[0].profileId, 'v2')
  assert.equal((await repository.publicEvidenceForRelease('b'.repeat(64), { limit: 12 })).items[0].profileId, 'v1')
})

test('scientific public evidence uses the fixed suite order for a profile and preserves rank/profile pagination for a case', async () => {
  const [firstCase, secondCase] = PB_SCIENTIFIC_FIGURE_V2.cases
  const editCase = PB_SCIENTIFIC_FIGURE_V2.cases.find((item) => item.kind === 'edit')!
  const releaseHash = 'a'.repeat(64)
  const rows = new Map<string, any[]>([
    ['paperbanana_benchmark_releases', [{ releaseHash, evaluationMode: 'codex_scientific_v2' }]],
    ['paperbanana_benchmark_scientific_v2_public_evidence', [
      { sourceReleaseHash: releaseHash, profileId: 'profile-b', caseId: editCase.id, overallRank: 2 },
      { sourceReleaseHash: releaseHash, profileId: 'profile-b', caseId: firstCase.id, overallRank: 2 },
      { sourceReleaseHash: releaseHash, profileId: 'profile-b', caseId: secondCase.id, overallRank: 2 },
      { sourceReleaseHash: releaseHash, profileId: 'profile-a', caseId: firstCase.id, overallRank: 1 },
    ]],
  ])
  const collection = (name: string) => ({
    async findOne(query: any) { return (rows.get(name) || []).find((row) => matches(row, query)) || null },
    find(query: any) {
      let selected = (rows.get(name) || []).filter((row) => matches(row, query))
      const cursor: any = {
        sort(specification: any) {
          selected.sort((left, right) => Object.keys(specification).reduce((comparison, key) => comparison || String(left[key]).localeCompare(String(right[key])) * specification[key], 0))
          return cursor
        },
        skip(offset: number) { selected = selected.slice(offset); return cursor },
        limit(limit: number) { selected = selected.slice(0, limit); return cursor },
        async toArray() { return structuredClone(selected) },
      }
      return cursor
    },
  })
  const repository = createMongoBenchmarkRepository({ collection, client: { startSession() { throw new Error('unused') } } } as any)

  const profile = await repository.publicEvidenceForRelease(releaseHash, { profileId: 'profile-b', limit: 12 })
  assert.deepEqual(profile.items.map((item: any) => item.caseId), [firstCase.id, secondCase.id, editCase.id])

  const casePage = await repository.publicEvidenceForRelease(releaseHash, { caseId: firstCase.id, limit: 1 })
  assert.deepEqual(casePage.items.map((item: any) => item.profileId), ['profile-a'])
  assert.equal(casePage.nextCursor, '1')
})

test('published V2 evidence is immediately consumable by model profile and paginated case actions with edit before/after', async () => {
  const fixture = scientificBatchFixture()
  const state = completedScientificState(fixture)
  const storage = atomicScientificDb()
  const secret = 'scientific-v2-public-e2e-secret-at-least-32-bytes'
  const batchId = 'scientific-v2-public-e2e'
  const scientific = createScientificV2MongoRepository(storage.db, () => FIXED_NOW, () => 'public-e2e-claim', {
    operatorReportSecret: secret, verifyObject: async () => {},
  })
  await scientific.freezeBatch({ batchId, ...fixture })
  const input = await preparePublishFacts(scientific, fixture, state, secret, batchId)
  const published = await scientific.publishScientificV2({ batchId, ...input })
  const repository = createMongoBenchmarkRepository(storage.db, () => FIXED_NOW, async () => {})
  const service = createBenchmarkService({
    repository,
    verifyEvidence: async () => {},
    signEvidence: async (objectKey) => `https://signed.example/${canonicalHash(objectKey)}`,
  })
  const release = storage.rows.get('paperbanana_benchmark_releases')!.find((row) => row.releaseHash === published.releaseHash)!
  const profile = await service.handle({ action: 'benchmarkModelProfile', profileId: release.models[0].profileId }, false) as any
  assert.equal(profile.profile.evidence.length, 9)
  assert.equal(profile.profile.evidence[0].requestedResolution, '2K')
  assert.deepEqual(profile.profile.evidence[0].actualOutputPixels, {
    width: 2048, height: 1152, megapixels: 2.3593, fileSizeBytes: 4096,
  })
  const edit = profile.profile.evidence.find((item: any) => item.kind === 'edit')
  assert.match(edit.beforeVariants[0].url, /^https:\/\/signed\.example\//)
  assert.match(edit.variants[0].url, /^https:\/\/signed\.example\//)
  assert.equal(JSON.stringify(profile).includes('objectKey'), false)
  const firstPage = await service.handle({ action: 'benchmarkCaseEvidence', caseId: edit.caseId, limit: 1 }, false) as any
  assert.equal(firstPage.items.length, 1)
  assert.equal(firstPage.nextCursor, '1')
  const secondPage = await service.handle({ action: 'benchmarkCaseEvidence', caseId: edit.caseId, limit: 1, cursor: firstPage.nextCursor }, false) as any
  assert.equal(secondPage.items.length, 1)
  assert.equal(secondPage.nextCursor, null)
})
