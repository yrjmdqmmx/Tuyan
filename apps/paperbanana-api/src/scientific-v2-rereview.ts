import { createHmac, timingSafeEqual } from 'node:crypto'
import {
  canonicalHash, PB_SCIENTIFIC_FIGURE_V2, SCIENTIFIC_BENCHMARK_IDENTITY,
  SCIENTIFIC_BENCHMARK_AXES, SCIENTIFIC_REVIEW_RED_LINE_CODES,
  aggregateScientificFixedSlots, rankScientificModels,
} from '@paperbanana/benchmark-core'

type Row = Record<string, any>
type Role = 'A' | 'B'
const HASH = /^[a-f0-9]{64}$/
const DOMAIN = 'paperbanana/scientific-v2/review-only/v1'
const compare = (a: string, b: string) => Buffer.compare(Buffer.from(a), Buffer.from(b))
const sorted = (values: string[]) => [...values].sort(compare)
const same = (a: unknown, b: unknown) => canonicalHash(a) === canonicalHash(b)
function fail(code: string): never { throw new Error(`SCIENTIFIC_V2_REREVIEW_${code}`) }
function freeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    Object.values(value as Row).forEach(freeze)
  }
  return value
}
function exact(value: any, keys: string[], code = 'SCHEMA_INVALID') {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || !same(Object.keys(value).sort(), [...keys].sort())) fail(code)
}
function instant(value: any) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(value)
    || !Number.isFinite(Date.parse(value))) fail('TIME_INVALID')
}
function secretKey(secret: string) {
  if (typeof secret !== 'string' || Buffer.byteLength(secret) < 32 || Buffer.byteLength(secret) > 4096) fail('SECRET_INVALID')
  return createHmac('sha256', secret).update(DOMAIN).digest()
}
function sign(kind: string, value: unknown, secret: string) {
  return createHmac('sha256', secretKey(secret)).update(`${kind}:${canonicalHash(value)}`).digest('hex')
}
function verifySigned(kind: string, value: Row, hashField: string, secret: string) {
  const { attestation, [hashField]: hash, ...base } = value
  if (!HASH.test(String(hash)) || hash !== canonicalHash(base)
    || !HASH.test(String(attestation))) fail('ATTESTATION_INVALID')
  const expected = sign(kind, { ...base, [hashField]: hash }, secret)
  if (!timingSafeEqual(Buffer.from(attestation, 'hex'), Buffer.from(expected, 'hex'))) fail('ATTESTATION_INVALID')
}
function signed(kind: string, base: Row, hashField: string, secret: string): Row {
  const value = { ...base, [hashField]: canonicalHash(base) }
  return freeze({ ...value, attestation: sign(kind, value, secret) })
}

export const SCIENTIFIC_V2_FROZEN_REREVIEW_SCOPE = freeze({
  "schemaVersion": 1,
  "frozenAt": "2026-09-17T02:07:46.698392+00:00",
  "baselineReleaseId": "bench-scientific-v2-release-8b7dcbc5447676487a70",
  "baselineReleaseHash": "8b7dcbc5447676487a709e07ee33ab529631dfda58d92fc4f8e3206be07122b4",
  "suiteId": "pb-scientific-figure-v2",
  "suiteHash": "127b032a63fc0ffa0a0c540c65064842d5f17cc482ae0de3ef030af2dff3660a",
  "reviewProtocol": "codex-independent-double-review-v2",
  "evaluationEpoch": "codex-scientific-2026-09-v1",
  "targetModelIds": [
    "black-forest-labs/flux.2-flex",
    "black-forest-labs/flux.2-klein-4b",
    "black-forest-labs/flux.2-max",
    "black-forest-labs/flux.2-pro",
    "doubao-seedream-4-0-250828",
    "krea/krea-2-large",
    "krea/krea-2-medium",
    "krea/krea-2-medium-turbo",
    "microsoft/mai-image-2.5",
    "microsoft/mai-image-2.5-pro",
    "microsoft/mai-image-2.6",
    "qwen-image-2.0",
    "qwen-image-2.0-pro",
    "qwen-image-3.0-pro",
    "qwen/qwen-image-3",
    "recraft/recraft-v3",
    "recraft/recraft-v4",
    "recraft/recraft-v4-pro",
    "recraft/recraft-v4-pro-vector",
    "recraft/recraft-v4-styles-pro-vector",
    "recraft/recraft-v4-styles-vector",
    "recraft/recraft-v4-vector",
    "recraft/recraft-v4.1",
    "recraft/recraft-v4.1-pro",
    "recraft/recraft-v4.1-pro-vector",
    "recraft/recraft-v4.1-utility",
    "recraft/recraft-v4.1-utility-pro",
    "recraft/recraft-v4.1-vector",
    "seedream-4.5",
    "seedream-5.0",
    "seedream-5.0-pro",
    "sourceful/riverflow-v2-fast",
    "sourceful/riverflow-v2-pro",
    "sourceful/riverflow-v2.5-fast",
    "sourceful/riverflow-v2.5-pro",
    "wan2.7-image",
    "wan2.7-image-pro",
    "x-ai/grok-imagine-image-2.0",
    "x-ai/grok-imagine-image-quality",
    "z-image-turbo"
  ],
  "preservedModelIds": [
    "google/nano-banana-2-lite",
    "google/nano-banana-2",
    "google/nano-banana-pro",
    "google/nano-banana",
    "openai/gpt-image-2",
    "openai/gpt-image-2.5-sunburst",
    "openai/gpt-image-2.5-flare"
  ],
  "forbiddenCurrentModelIds": [
    "codex:gpt-image-2"
  ],
  "modelCount": 47,
  "targetModelCount": 40,
  "preservedModelCount": 7,
  "targetFixedSlots": 360,
  "preservedFixedSlots": 63,
  "totalFixedSlots": 423,
  "originalSuccessfulImageCount": 406,
  "newProviderCallsAllowed": 0,
  "reviewModel": "gpt-6-astra",
  "reviewReasoningEffort": "xhigh",
  "lineageId": "lin-f555a0927b7fa166",
  "parentHandoffId": "20260917-094344-codex-tuyan-scientific-v2-benchmark-completion-01a0760a-5be4-7492-9adc-",
  "scopeHash": "44d1b541a84a49b208025addc89295da99f419997f6fdc980a37d5d5aef4177e"
} as const)

function assertRoster(scope: Row) {
  if (scope.schemaVersion !== 1 || scope.modelCount !== 47 || scope.targetModelCount !== 40
    || scope.preservedModelCount !== 7 || scope.targetFixedSlots !== 360 || scope.preservedFixedSlots !== 63
    || scope.totalFixedSlots !== 423 || scope.originalSuccessfulImageCount !== 406
    || scope.newProviderCallsAllowed !== 0 || scope.reviewModel !== 'gpt-6-astra'
    || scope.reviewReasoningEffort !== 'xhigh'
    || scope.suiteHash !== PB_SCIENTIFIC_FIGURE_V2.manifestHash
    || scope.suiteId !== SCIENTIFIC_BENCHMARK_IDENTITY.suiteId
    || scope.reviewProtocol !== SCIENTIFIC_BENCHMARK_IDENTITY.reviewProtocol
    || scope.evaluationEpoch !== SCIENTIFIC_BENCHMARK_IDENTITY.evaluationEpoch
    || !same(scope.forbiddenCurrentModelIds, ['codex:gpt-image-2'])
    || !same(scope.targetModelIds, SCIENTIFIC_V2_FROZEN_REREVIEW_SCOPE.targetModelIds)
    || !same(scope.preservedModelIds, SCIENTIFIC_V2_FROZEN_REREVIEW_SCOPE.preservedModelIds)
    || !HASH.test(String(scope.baselineReleaseHash))) fail('SCOPE_INVALID')
}

function normalizePublicVariant(value: Row, sourceHash: string) {
  exact(value, ['kind', 'objectKey', 'imageHash', 'width', 'height', 'fileSizeBytes', 'mimeType'], 'PUBLIC_EVIDENCE_INVALID')
  if (!['thumbnail', 'detail', 'full'].includes(value.kind) || value.mimeType !== 'image/webp'
    || !HASH.test(String(value.imageHash)) || value.objectKey !== `bench/scientific-v2/public/${sourceHash}/${value.kind}.webp`
    || !['width', 'height', 'fileSizeBytes'].every(key => Number.isInteger(value[key]) && value[key] > 0)) fail('PUBLIC_EVIDENCE_INVALID')
  const { objectKey: _objectKey, ...publicValue } = value
  return publicValue
}

function assertBaseline(baseline: Row, scope: Row) {
  if (!baseline || typeof baseline !== 'object') fail('BASELINE_INVALID')
  const { _id, releaseHash, ...base } = baseline
  if (_id !== scope.baselineReleaseId || releaseHash !== scope.baselineReleaseHash
    || canonicalHash(base) !== releaseHash || baseline.profileStatus !== 'published'
    || Object.entries(SCIENTIFIC_BENCHMARK_IDENTITY).some(([key, value]) => baseline[key] !== value)
    || baseline.suiteHash !== PB_SCIENTIFIC_FIGURE_V2.manifestHash
    || !Array.isArray(baseline.models) || baseline.models.length !== 47
    || !same(sorted(baseline.models.map((m: Row) => m.canonicalModelId)), sorted([...scope.targetModelIds, ...scope.preservedModelIds]))) fail('BASELINE_INVALID')
  let successes = 0
  for (const model of baseline.models) {
    if (model.canonicalModelId === 'codex:gpt-image-2' || model.modelId !== model.canonicalModelId
      || !Array.isArray(model.evidence) || model.evidence.length !== 9
      || !same(sorted(model.evidence.map((e: Row) => e.caseId)), sorted(PB_SCIENTIFIC_FIGURE_V2.cases.map(c => c.id)))) fail('BASELINE_INVALID')
    for (const evidence of model.evidence) {
      const problem = PB_SCIENTIFIC_FIGURE_V2.cases.find(c => c.id === evidence.caseId)!
      if (evidence.kind !== problem.kind || !['succeeded', 'failed', 'unsupported'].includes(evidence.status)) fail('BASELINE_INVALID')
      if (evidence.status === 'succeeded') {
        successes += 1
        if (!HASH.test(String(evidence.imageHash))
          || (problem.kind === 'edit' && (evidence.sourceHash !== problem.sourceHash || evidence.editedHash !== evidence.imageHash || evidence.region !== problem.region))) fail('BASELINE_INVALID')
      }
    }
  }
  if (successes !== scope.originalSuccessfulImageCount || baseline.sampleCount !== successes) fail('BASELINE_INVALID')
}

function assertPublicEvidence(baseline: Row, rows: Row[]) {
  if (!Array.isArray(rows) || rows.length !== 423) fail('PUBLIC_EVIDENCE_INVALID')
  const byKey = new Map<string, Row>()
  for (const row of rows) {
    const model = baseline.models.find((m: Row) => m.canonicalModelId === row.canonicalModelId)
    const evidence = model?.evidence.find((e: Row) => e.caseId === row.caseId)
    const key = `${row.canonicalModelId}\0${row.caseId}`
    if (!evidence || byKey.has(key) || row.sourceReleaseHash !== baseline.releaseHash
      || row.profileId !== model.profileId || row.overallRank !== model.overallRank) fail('PUBLIC_EVIDENCE_INVALID')
    exact(row, ['_id', 'sourceReleaseHash', 'profileId', 'canonicalModelId', 'overallRank', ...Object.keys(evidence), 'createdAt'], 'PUBLIC_EVIDENCE_INVALID')
    const payload = structuredClone(row)
    for (const field of ['_id', 'sourceReleaseHash', 'profileId', 'canonicalModelId', 'overallRank', 'createdAt']) delete payload[field]
    if (Array.isArray(payload.variants)) payload.variants = payload.variants.map((v: Row) => normalizePublicVariant(v, evidence.imageHash))
    if (Array.isArray(payload.beforeVariants)) payload.beforeVariants = payload.beforeVariants.map((v: Row) => normalizePublicVariant(v, evidence.sourceHash))
    if (!same(payload, evidence)) fail('PUBLIC_EVIDENCE_INVALID')
    byKey.set(key, row)
  }
  return byKey
}

function scoresFor(value: Row, axes: readonly string[]) {
  exact(value, [...axes], 'SCORE_INVALID')
  for (const axis of axes) if (typeof value[axis] !== 'number' || !Number.isFinite(value[axis]) || value[axis] < 0 || value[axis] > 10) fail('SCORE_INVALID')
  return structuredClone(value)
}
function rationaleFor(value: unknown) {
  if (typeof value !== 'string' || value.trim() !== value || value.length < 8 || value.length > 500
    || /[\u0000-\u001f\u007f]|\p{Cf}/u.test(value)) fail('RATIONALE_INVALID')
  const compact = value.normalize('NFKC').toLocaleLowerCase('en-US').replace(/[\p{P}\p{Z}\p{Cf}]/gu, '')
  const generic = ['加分双盲审核未确认红线问题', '双盲审核未确认红线问题', '整体表现良好', '整体符合要求', '基本符合要求',
    '未发现明显问题', '没有明显问题', '无明显问题', '图像质量良好', '内容基本准确', '结果符合题意', '整体效果不错', '整体效果良好', '符合要求',
    'looksgood', 'meetsrequirements', 'noobviousissues', 'overallgood']
  if (generic.some(prefix => compact.startsWith(prefix))
    || /(?:reviewer\s*[ab]?|blind-[a-z0-9-]+|https?:\/\/|www\.|mailto:|object\s*key|mapping\s*hash|attestation|hmac|\/tmp\/|\/Users\/|\/home\/|bench\/scientific-v2\/private\/|[a-z]:\\)/iu.test(value)
    || /\b(?:api[-_ ]?key|access[-_ ]?token|secret|password|credential|authorization|bearer)\b/iu.test(value)
    || /\b[a-f0-9]{40}(?:[a-f0-9]{24})?\b/iu.test(value)) fail('RATIONALE_INVALID')
  return { rationale: value, key: compact }
}
function redLinesFor(value: unknown) {
  if (!Array.isArray(value) || value.length > SCIENTIFIC_REVIEW_RED_LINE_CODES.length
    || value.some(v => typeof v !== 'string' || !(SCIENTIFIC_REVIEW_RED_LINE_CODES as readonly string[]).includes(v))
    || new Set(value).size !== value.length) fail('RED_LINE_INVALID')
  return sorted(value)
}
function reviewerFor(value: Row) {
  exact(value, ['model', 'reasoningEffort', 'agentId', 'contextId'], 'REVIEWER_INVALID')
  if (value.model !== 'gpt-6-astra' || value.reasoningEffort !== 'xhigh'
    || !['agentId', 'contextId'].every(key => typeof value[key] === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/.test(value[key]))) fail('REVIEWER_INVALID')
  return structuredClone(value)
}
function independent(...reviewers: Row[]) {
  if (new Set(reviewers.map(r => r.agentId)).size !== reviewers.length
    || new Set(reviewers.map(r => r.contextId)).size !== reviewers.length) fail('REVIEWER_NOT_INDEPENDENT')
}
function viewedFor(value: unknown, item: Row) {
  const expected = sorted([...new Set<string>([item.imageHash, ...(item.kind === 'edit' ? [item.sourceHash] : [])])])
  if (!Array.isArray(value) || value.some(v => typeof v !== 'string' || !HASH.test(v))
    || value.length !== expected.length || !same(sorted(value), expected)) fail('IMAGE_NOT_VIEWED')
  return expected
}

/** The factory is server-code dependency injection for fixture testing, never an admin-input policy. */
export function createRereviewProtocol(policy: Row) {
  assertRoster(policy)
  const frozenScope = freeze(structuredClone(policy))
  const assertScope = (scope: Row) => { if (!same(scope, frozenScope)) fail('SCOPE_INVALID') }
  function verifySession(session: Row, secret: string) {
    exact(session, ['schemaVersion', 'kind', 'sessionId', 'scope', 'baseline', 'sourceEvidenceHash', 'issuedAt', 'providerCalls', 'privateMappings', 'assignments', 'sessionHash', 'attestation'])
    verifySigned('session', session, 'sessionHash', secret)
    assertScope(session.scope)
    if (session.schemaVersion !== 1 || session.kind !== 'existing_artifact_rereview' || session.providerCalls !== 0) fail('SESSION_INVALID')
    for (const role of ['A', 'B'] as Role[]) {
      verifySigned('assignment', session.assignments[role], 'assignmentHash', secret)
      if (session.assignments[role].role !== role || session.assignments[role].sessionId !== session.sessionId) fail('SESSION_INVALID')
    }
  }
  function createRereviewSession(input: { baseline: Row; publicEvidence: Row[]; scope: Row; secret: string; issuedAt: string; sessionId: string }) {
    exact(input, ['baseline', 'publicEvidence', 'scope', 'secret', 'issuedAt', 'sessionId'])
    assertScope(input.scope)
    assertBaseline(input.baseline, frozenScope)
    assertPublicEvidence(input.baseline, input.publicEvidence)
    instant(input.issuedAt)
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{2,199}$/.test(input.sessionId)) fail('SESSION_INVALID')
    const targets = new Set(frozenScope.targetModelIds)
    const privateMappings: Row[] = []
    const items: Row[] = []
    for (const model of input.baseline.models) if (targets.has(model.canonicalModelId)) for (const evidence of model.evidence) {
      if (evidence.status !== 'succeeded') continue
      const problem = PB_SCIENTIFIC_FIGURE_V2.cases.find(c => c.id === evidence.caseId)!
      const itemHash = canonicalHash({ sessionId: input.sessionId, baselineReleaseHash: input.baseline.releaseHash, modelId: model.canonicalModelId, caseId: evidence.caseId, imageHash: evidence.imageHash })
      const item: Row = { itemHash, caseId: problem.id, kind: problem.kind, imageHash: evidence.imageHash,
        caseManifestHash: problem.manifestHash, instruction: problem.instruction,
        applicableAxes: [...problem.applicableAxes], rubric: structuredClone(problem.rubric),
        ...(problem.kind === 'edit' ? { sourceHash: problem.sourceHash, editedHash: evidence.imageHash, region: problem.region }
          : { negativePrompt: problem.negativePrompt, aspectRatio: problem.aspectRatio }) }
      items.push(item)
      privateMappings.push({ itemHash, canonicalModelId: model.canonicalModelId, caseId: problem.id, imageHash: evidence.imageHash })
    }
    if (items.length === 0) fail('EMPTY_REVIEW')
    const assignments: Row = {}
    for (const role of ['A', 'B'] as Role[]) {
      const ordered = [...items].sort((a, b) => compare(sign(`order-${role}`, a.itemHash, input.secret), sign(`order-${role}`, b.itemHash, input.secret)))
      if (role === 'B' && same(ordered.map(x => x.itemHash), assignments.A.items.map((x: Row) => x.itemHash))) ordered.reverse()
      const publicItems = ordered.map(item => ({ ...item, blindLabel: `blind-${sign(`label-${role}`, item.itemHash, input.secret).slice(0, 16)}` }))
      assignments[role] = signed('assignment', { schemaVersion: 1, kind: 'existing_artifact_blind_review', sessionId: input.sessionId, role, items: publicItems }, 'assignmentHash', input.secret)
    }
    return signed('session', { schemaVersion: 1, kind: 'existing_artifact_rereview', sessionId: input.sessionId,
      scope: structuredClone(frozenScope), baseline: { releaseId: input.baseline._id, releaseHash: input.baseline.releaseHash,
        batchId: input.baseline.batchId, manifestHash: input.baseline.batchManifestHash },
      sourceEvidenceHash: canonicalHash([...input.publicEvidence].sort((a, b) => compare(`${a.canonicalModelId}\0${a.caseId}`, `${b.canonicalModelId}\0${b.caseId}`))),
      issuedAt: input.issuedAt, providerCalls: 0, privateMappings, assignments }, 'sessionHash', input.secret)
  }
  function getPublicAssignment(input: { session: Row; role: Role; secret: string }) {
    exact(input, ['session', 'role', 'secret'])
    verifySession(input.session, input.secret)
    if (!['A', 'B'].includes(input.role)) fail('ROLE_INVALID')
    return freeze({ sessionHash: input.session.sessionHash, ...structuredClone(input.session.assignments[input.role]) })
  }
  function validateRereviewSubmission(input: { session: Row; role: Role; submission: Row; secret: string }) {
    exact(input, ['session', 'role', 'submission', 'secret'])
    verifySession(input.session, input.secret)
    if (!['A', 'B'].includes(input.role)) fail('ROLE_INVALID')
    const submission = input.submission
    exact(submission, ['sessionHash', 'assignmentHash', 'role', 'shards'])
    const assignment = input.session.assignments[input.role]
    if (submission.sessionHash !== input.session.sessionHash || submission.assignmentHash !== assignment.assignmentHash || submission.role !== input.role) fail('ASSIGNMENT_MISMATCH')
    if (!Array.isArray(submission.shards) || submission.shards.length < 1 || submission.shards.length > assignment.items.length) fail('RESULT_SET_INVALID')
    const byHash = new Map<string, Row>(assignment.items.map((item: Row) => [item.itemHash, item]))
    const seen = new Set<string>(), rationales = new Set<string>()
    const results: Row[] = []
    for (const shard of submission.shards) {
      exact(shard, ['reviewer', 'results'])
      const reviewer = reviewerFor(shard.reviewer)
      if (!Array.isArray(shard.results) || shard.results.length < 1 || shard.results.length > assignment.items.length) fail('RESULT_SET_INVALID')
      for (const result of shard.results) {
        exact(result, ['itemHash', 'blindLabel', 'scores', 'redLines', 'lowConfidence', 'rationale', 'viewedImageHashes'])
        const item = byHash.get(result.itemHash)
        if (!item || seen.has(result.itemHash) || result.blindLabel !== item.blindLabel || typeof result.lowConfidence !== 'boolean') fail('RESULT_SET_INVALID')
        seen.add(result.itemHash)
        const rationale = rationaleFor(result.rationale)
        if (rationales.has(rationale.key)) fail('RATIONALE_INVALID')
        rationales.add(rationale.key)
        results.push({ itemHash: result.itemHash, scores: scoresFor(result.scores, item.applicableAxes),
          redLines: redLinesFor(result.redLines), lowConfidence: result.lowConfidence, rationale: rationale.rationale,
          viewedImageHashes: viewedFor(result.viewedImageHashes, item), reviewer })
      }
    }
    if (seen.size !== assignment.items.length) fail('RESULT_SET_INVALID')
    results.sort((a, b) => compare(a.itemHash, b.itemHash))
    return signed('result', { schemaVersion: 1, sessionHash: input.session.sessionHash, assignmentHash: assignment.assignmentHash,
      role: input.role, results }, 'resultHash', input.secret)
  }
  function verifyResult(session: Row, result: Row, role: Role, secret: string) {
    verifySigned('result', result, 'resultHash', secret)
    // Re-run all semantic validation, not merely the HMAC check.
    const assignment = session.assignments[role]
    const labels = new Map<string, string>(assignment.items.map((item: Row) => [item.itemHash, item.blindLabel]))
    const recomputed = validateRereviewSubmission({ session, role, secret, submission: {
      sessionHash: result.sessionHash, assignmentHash: result.assignmentHash, role: result.role,
      shards: result.results.map((item: Row) => {
        const { reviewer, ...review } = item
        return { reviewer, results: [{ ...review, blindLabel: labels.get(item.itemHash) }] }
      }),
    } })
    if (!same(recomputed, result)) fail('RESULT_INVALID')
  }
  function finalizeRereview(input: { session: Row; reviewerA: Row; reviewerB: Row; arbitration?: Row; secret: string }) {
    exact(input, ['session', 'reviewerA', 'reviewerB', 'secret', ...(input.arbitration !== undefined ? ['arbitration'] : [])])
    const { session, reviewerA, reviewerB, secret } = input
    verifySession(session, secret)
    verifyResult(session, reviewerA, 'A', secret)
    verifyResult(session, reviewerB, 'B', secret)
    const aAgents = new Set(reviewerA.results.map((r: Row) => r.reviewer.agentId))
    const aContexts = new Set(reviewerA.results.map((r: Row) => r.reviewer.contextId))
    if (reviewerB.results.some((r: Row) => aAgents.has(r.reviewer.agentId) || aContexts.has(r.reviewer.contextId))) fail('REVIEWER_NOT_INDEPENDENT')
    const items = new Map<string, Row>(session.assignments.A.items.map((item: Row) => [item.itemHash, item]))
    const byA = new Map<string, Row>(reviewerA.results.map((item: Row) => [item.itemHash, item]))
    const byB = new Map<string, Row>(reviewerB.results.map((item: Row) => [item.itemHash, item]))
    const disputes: Row[] = []
    const results = reviewerA.results.map((a: Row) => {
      const b = byB.get(a.itemHash)!, item = items.get(a.itemHash)!
      independent(a.reviewer, b.reviewer)
      const reasons: string[] = []
      if (item.applicableAxes.some((axis: string) => Math.abs(a.scores[axis] - b.scores[axis]) > 2)) reasons.push('score_gap_gt_2')
      if (!same(a.redLines, b.redLines)) reasons.push('red_line_conflict')
      if (a.lowConfidence || b.lowConfidence) reasons.push('low_confidence')
      if (reasons.length) disputes.push({ itemHash: a.itemHash, applicableAxes: [...item.applicableAxes], reasons })
      return { itemHash: a.itemHash, scores: Object.fromEntries(item.applicableAxes.map((axis: string) => [axis, (a.scores[axis] + b.scores[axis]) / 2])),
        redLines: sorted([...new Set<string>([...a.redLines, ...b.redLines])]),
        rationales: [...new Set([a.rationale, b.rationale])], resolution: reasons.length ? 'pending_arbitration' : 'ab_mean' }
    })
    let arbitration: Row | null = null
    if (input.arbitration !== undefined) {
      const candidate = input.arbitration
      exact(candidate, ['sessionHash', 'reviewerAHash', 'reviewerBHash', 'shards'])
      if (candidate.sessionHash !== session.sessionHash || candidate.reviewerAHash !== reviewerA.resultHash
        || candidate.reviewerBHash !== reviewerB.resultHash || !Array.isArray(candidate.shards)
        || candidate.shards.length < 1 || candidate.shards.length > disputes.length || disputes.length === 0) fail('ARBITRATION_SET_INVALID')
      const required = new Set<string>(disputes.map(item => item.itemHash)), seen = new Set<string>(), rationales = new Set<string>()
      const resolved: Row[] = []
      for (const shard of candidate.shards) {
        exact(shard, ['reviewer', 'results'])
        const reviewer = reviewerFor(shard.reviewer)
        if (!Array.isArray(shard.results) || shard.results.length < 1 || shard.results.length > disputes.length) fail('ARBITRATION_SET_INVALID')
        for (const result of shard.results) {
          exact(result, ['itemHash', 'scores', 'redLines', 'rationale', 'viewedImageHashes'])
          if (!required.has(result.itemHash) || seen.has(result.itemHash)) fail('ARBITRATION_SET_INVALID')
          seen.add(result.itemHash)
          independent(byA.get(result.itemHash)!.reviewer, byB.get(result.itemHash)!.reviewer, reviewer)
          const item = items.get(result.itemHash)!, rationale = rationaleFor(result.rationale)
          if (rationales.has(rationale.key)) fail('RATIONALE_INVALID')
          rationales.add(rationale.key)
          const normalized = { itemHash: result.itemHash, scores: scoresFor(result.scores, item.applicableAxes), redLines: redLinesFor(result.redLines),
            rationale: rationale.rationale, viewedImageHashes: viewedFor(result.viewedImageHashes, item), reviewer }
          const final = results.find((row: Row) => row.itemHash === result.itemHash)!
          final.scores = normalized.scores; final.redLines = normalized.redLines
          final.rationales = [normalized.rationale]; final.resolution = 'xhigh_arbitration'
          resolved.push(normalized)
        }
      }
      if (seen.size !== disputes.length) fail('ARBITRATION_SET_INVALID')
      resolved.sort((a, b) => compare(a.itemHash, b.itemHash))
      arbitration = { sessionHash: candidate.sessionHash, reviewerAHash: candidate.reviewerAHash, reviewerBHash: candidate.reviewerBHash, results: resolved }
    }
    return signed('final', { schemaVersion: 1, sessionHash: session.sessionHash, reviewerAHash: reviewerA.resultHash, reviewerBHash: reviewerB.resultHash,
      disputes, results, arbitration, canFinalize: disputes.length === 0 || arbitration !== null, providerCalls: 0 }, 'finalHash', secret)
  }
  function getDisputeAssignment(input: { session: Row; final: Row; secret: string }) {
    exact(input, ['session', 'final', 'secret'])
    verifySession(input.session, input.secret)
    verifySigned('final', input.final, 'finalHash', input.secret)
    if (input.final.sessionHash !== input.session.sessionHash || input.final.disputes.length === 0) fail('ARBITRATION_SET_INVALID')
    const disputed = new Set(input.final.disputes.map((item: Row) => item.itemHash))
    const items = input.session.assignments.A.items.filter((item: Row) => disputed.has(item.itemHash)).map((item: Row) => ({
      ...structuredClone(item), blindLabel: `blind-${sign('label-arbitration', item.itemHash, input.secret).slice(0, 16)}`,
    }))
    return signed('arbitration-assignment', { schemaVersion: 1, kind: 'existing_artifact_blind_arbitration',
      sessionHash: input.session.sessionHash, reviewerAHash: input.final.reviewerAHash, reviewerBHash: input.final.reviewerBHash,
      items }, 'assignmentHash', input.secret)
  }
  function projectRereviewRelease(input: { baseline: Row; publicEvidence: Row[]; session: Row; final: Row; secret: string; publishedAt: string; publicationCodeSha: string }) {
    exact(input, ['baseline', 'publicEvidence', 'session', 'final', 'secret', 'publishedAt', 'publicationCodeSha'])
    const { baseline, session, final, secret } = input
    verifySession(session, secret)
    assertBaseline(baseline, frozenScope)
    const rows = assertPublicEvidence(baseline, input.publicEvidence)
    if (session.sourceEvidenceHash !== canonicalHash([...input.publicEvidence].sort((a, b) => compare(`${a.canonicalModelId}\0${a.caseId}`, `${b.canonicalModelId}\0${b.caseId}`)))) fail('PUBLIC_EVIDENCE_INVALID')
    verifySigned('final', final, 'finalHash', secret)
    if (final.sessionHash !== session.sessionHash || final.canFinalize !== true || final.providerCalls !== 0
      || final.results.some((row: Row) => row.resolution === 'pending_arbitration')) fail('FINAL_INCOMPLETE')
    instant(input.publishedAt)
    if (!/^[a-f0-9]{40}$/.test(input.publicationCodeSha)) fail('CODE_SHA_INVALID')
    const finalByHash = new Map<string, Row>(final.results.map((row: Row) => [row.itemHash, row]))
    if (finalByHash.size !== session.privateMappings.length || final.results.length !== finalByHash.size) fail('COVERAGE_INVALID')
    const bySlot = new Map<string, Row>()
    for (const mapping of session.privateMappings) {
      const result = finalByHash.get(mapping.itemHash)
      if (!result) fail('COVERAGE_INVALID')
      bySlot.set(`${mapping.canonicalModelId}\0${mapping.caseId}`, result)
    }
    const targets = new Set(frozenScope.targetModelIds)
    const models: Row[] = structuredClone(baseline.models)
    for (const model of models) if (targets.has(model.canonicalModelId)) {
      for (const evidence of model.evidence) if (evidence.status === 'succeeded') {
        const result = bySlot.get(`${model.canonicalModelId}\0${evidence.caseId}`)
        if (!result) fail('COVERAGE_INVALID')
        const problem = PB_SCIENTIFIC_FIGURE_V2.cases.find(c => c.id === evidence.caseId)!
        evidence.scores = scoresFor(result.scores, problem.applicableAxes)
        evidence.reviewNotes = result.rationales.map((rationale: string) => rationaleFor(rationale).rationale)
      }
      const aggregation = aggregateScientificFixedSlots(model.evidence.map((e: Row) => ({ caseId: e.caseId, status: e.status, ...(e.status === 'succeeded' ? { scores: e.scores } : {}) })))
      model.dimensions = structuredClone(aggregation.byAxis)
      model.scores = Object.fromEntries(SCIENTIFIC_BENCHMARK_AXES.map(axis => [axis, aggregation.byAxis[axis].mean]))
    }
    const ranked = rankScientificModels(models.map(model => ({ modelId: model.modelId, scores: model.scores })))
    const byId = new Map(ranked.map(model => [model.modelId, model]))
    for (const model of models) {
      const ranking = byId.get(model.modelId)!
      if (targets.has(model.canonicalModelId)) model.overallScore = ranking.overallScore
      model.overallRank = ranking.overallRank
      model.dimensionRanks = Object.fromEntries(SCIENTIFIC_BENCHMARK_AXES.map(axis => [axis, 1 + models.filter(other => other.scores[axis] > model.scores[axis]).length]))
    }
    models.sort((a, b) => a.overallRank - b.overallRank || compare(a.modelId, b.modelId))
    // Assert the allowed delta before releasing the draft to the database layer.
    for (const model of models) {
      const prior = baseline.models.find((row: Row) => row.canonicalModelId === model.canonicalModelId)!
      const restored = structuredClone(model)
      restored.overallRank = prior.overallRank; restored.dimensionRanks = structuredClone(prior.dimensionRanks)
      if (targets.has(model.canonicalModelId)) {
        for (const key of ['scores', 'dimensions', 'overallScore']) restored[key] = structuredClone(prior[key])
        restored.evidence.forEach((e: Row, index: number) => {
          if (e.status === 'succeeded') { e.scores = structuredClone(prior.evidence[index].scores); e.reviewNotes = structuredClone(prior.evidence[index].reviewNotes) }
        })
      }
      if (!same(restored, prior)) fail('PRESERVED_DATA_DRIFT')
    }
    const { _id: _oldId, releaseHash: _oldHash, ...base } = structuredClone(baseline)
    const releaseBase = { ...base, models, publishedAt: input.publishedAt, publicationCodeSha: input.publicationCodeSha,
      methodology: { ...structuredClone(base.methodology), publicationCodeSha: input.publicationCodeSha },
      reviewFinalHash: final.finalHash,
      reviewOnly: { schemaVersion: 1, kind: 'existing_artifact_rereview', source: structuredClone(session.baseline),
        sessionId: session.sessionId, sessionHash: session.sessionHash, scopeHash: frozenScope.scopeHash,
        finalHash: final.finalHash, reviewerAHash: final.reviewerAHash, reviewerBHash: final.reviewerBHash,
        targetModelIds: [...frozenScope.targetModelIds], preservedModelIds: [...frozenScope.preservedModelIds], providerCalls: 0 } }
    const releaseHash = canonicalHash(releaseBase)
    const release: Row = { _id: `bench-scientific-v2-release-${releaseHash.slice(0, 20)}`, ...releaseBase, releaseHash }
    const publicEvidence = models.flatMap(model => model.evidence.map((evidence: Row) => {
      const prior = rows.get(`${model.canonicalModelId}\0${evidence.caseId}`)!
      const row: Row = { ...structuredClone(prior), _id: `scientific-v2-public-evidence:${canonicalHash([releaseHash, model.profileId, evidence.caseId])}`,
        sourceReleaseHash: releaseHash, overallRank: model.overallRank, createdAt: input.publishedAt }
      if (targets.has(model.canonicalModelId) && evidence.status === 'succeeded') { row.scores = structuredClone(evidence.scores); row.reviewNotes = [...evidence.reviewNotes] }
      return row
    }))
    assertPublicEvidence(release, publicEvidence)
    return freeze({ release, publicEvidence })
  }
  return { createRereviewSession, getPublicAssignment, validateRereviewSubmission, finalizeRereview, getDisputeAssignment, projectRereviewRelease }
}

const production = createRereviewProtocol(SCIENTIFIC_V2_FROZEN_REREVIEW_SCOPE)
export const createRereviewSession = production.createRereviewSession
export const validateRereviewSubmission = production.validateRereviewSubmission
export const finalizeRereview = production.finalizeRereview
export const projectRereviewRelease = production.projectRereviewRelease

export const getPublicAssignment = production.getPublicAssignment
export const getDisputeAssignment = production.getDisputeAssignment
