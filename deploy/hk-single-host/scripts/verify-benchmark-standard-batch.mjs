import { createHash } from 'node:crypto'
import { lstat, readFile } from 'node:fs/promises'

const fail = () => { process.stderr.write('BENCHMARK_STANDARD_BATCH_MANIFEST_INVALID\n'); process.exitCode = 1 }
const hashPattern = /^[a-f0-9]{64}$/
const shaPattern = /^[a-f0-9]{40}$/
const runPattern = /^bench-run-[a-f0-9]{20}$/
const safeId = /^[A-Za-z0-9._:/-]{3,200}$/

async function main() {
  if (process.argv.length !== 3) throw new Error('path')
  const path = process.argv[2]
  const stat = await lstat(path)
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size < 2 || stat.size > 512 * 1024) throw new Error('file')
  const manifest = JSON.parse(await readFile(path, 'utf8'))
  const entries = Array.isArray(manifest.entries) ? manifest.entries : []
  if (manifest.schemaVersion !== 1 || manifest.evaluationMode !== 'codex_single' || manifest.suiteId !== 'pb-image-light-v1'
    || !shaPattern.test(manifest.codeSha) || !hashPattern.test(manifest.registryHash) || !hashPattern.test(manifest.canonicalManifestHash)
    || !Number.isInteger(manifest.maxModels) || manifest.maxModels < 1 || manifest.maxModels > 48
    || !Number.isInteger(manifest.maxGenerations) || manifest.maxGenerations !== manifest.maxModels * 4 || manifest.maxGenerations > 192
    || !Number.isFinite(manifest.maxEstimatedUsd) || manifest.maxEstimatedUsd <= 0
    || !entries.length || entries.length > manifest.maxModels) throw new Error('header')
  const runIds = new Set()
  const modelIds = new Set()
  let estimated = 0
  for (const entry of entries) {
    const args = entry?.args || {}
    const exactKeys = ['aspectRatiosHash', 'candidateSnapshotHash', 'estimatedPerGenerationUsd', 'immutableFactsHash', 'judgeEpoch', 'judgeStackHash', 'lane', 'maxEstimatedUsd', 'modelId', 'priceCapturedAt', 'priceHash', 'priceSource', 'provider', 'registryHash', 'runFactsHash', 'runHash', 'runId', 'runIntegrityAttestation', 'signedAuthorizationHash', 'suiteHash'].sort()
    if (!safeId.test(entry?.canonicalModelId || '') || modelIds.has(entry.canonicalModelId)
      || Object.keys(args).sort().some((key, index) => key !== exactKeys[index]) || Object.keys(args).length !== exactKeys.length
      || !runPattern.test(args.runId) || runIds.has(args.runId) || !['bailian', 'ark', 'openrouter'].includes(args.provider)
      || !safeId.test(args.modelId) || !['1K-standard', '2K-standard', '4K-standard', 'provider-default'].includes(args.lane)
      || args.registryHash !== manifest.registryHash || !hashPattern.test(args.suiteHash) || !hashPattern.test(args.judgeStackHash)
      || !hashPattern.test(args.signedAuthorizationHash) || !hashPattern.test(args.priceHash) || !hashPattern.test(args.runHash)
      || !hashPattern.test(args.runFactsHash) || !hashPattern.test(args.candidateSnapshotHash) || !hashPattern.test(args.aspectRatiosHash)
      || !hashPattern.test(args.runIntegrityAttestation) || !hashPattern.test(args.immutableFactsHash)
      || args.judgeEpoch !== 'judge-none-codex-single-v1' || !Number.isFinite(args.maxEstimatedUsd) || args.maxEstimatedUsd <= 0
      || !Number.isFinite(args.estimatedPerGenerationUsd) || args.estimatedPerGenerationUsd <= 0
      || args.estimatedPerGenerationUsd * 4 > args.maxEstimatedUsd + 1e-9
      || !/^https:\/\//.test(args.priceSource) || !Number.isFinite(Date.parse(args.priceCapturedAt))) throw new Error('entry')
    runIds.add(args.runId); modelIds.add(entry.canonicalModelId); estimated += args.maxEstimatedUsd
  }
  if (estimated > manifest.maxEstimatedUsd + 1e-9) throw new Error('budget')
  const { manifestHash, ...base } = manifest
  const normalize = (value) => Array.isArray(value) ? value.map(normalize) : value && typeof value === 'object'
    ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, normalize(child)])) : value
  const expectedHash = createHash('sha256').update(JSON.stringify(normalize(base))).digest('hex')
  if (manifestHash !== expectedHash) throw new Error('hash')
}

main().catch(fail)
