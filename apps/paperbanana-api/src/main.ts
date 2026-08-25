import path from 'node:path'
import { createHash } from 'node:crypto'

import { loadConfig } from './config.js'
import { loadBuildProvenance } from './build-provenance.js'
import { createMongoBenchmarkRepository } from './benchmark-repository.js'
import { createBenchmarkService } from './benchmark-service.js'
import { configureLafCloud } from './laf-cloud.js'
import { listenWithCleanup } from './listen.js'
import { createLogger } from './logger.js'
import { createMongoAdapter } from './mongo-adapter.js'
import { createOssAdapter } from './oss-adapter.js'
import { createProviderEgress } from './provider-egress.js'
import { prepareRuntime } from './runtime.js'
import { createServer, type LegacyHandler } from './server.js'
import { createGracefulShutdown } from './shutdown.js'

const serviceName = 'paperbanana-api'
const version = '0.1.0'
const logger = createLogger()

async function main(): Promise<void> {
  const buildProvenance = await loadBuildProvenance()
  const config = loadConfig(process.env, buildProvenance.codeSha)
  process.env.RESVG_WASM_PATH ||= path.join(process.cwd(), 'node_modules/@resvg/resvg-wasm/index_bg.wasm')

  const mongo = createMongoAdapter(config.mongodb)
  const oss = createOssAdapter(config.oss)
  const providerEgress = createProviderEgress(config.providerEgress)
  let legacyLifecycle = {
    stop() {},
    async drain() {},
  }
  const runtime = await prepareRuntime({
    mongo,
    oss,
    providerEgress,
    configureCloud: configureLafCloud,
    async loadHandler() {
      const legacy = await import('./legacy-entry.mjs')
      legacy.configureRuntimeFetch(providerEgress.fetch)
      legacy.configureJobAdmission(config.admission)
      legacy.startAccountDeletionSweep()
      legacyLifecycle = {
        stop() {
          legacy.stopJobAdmission()
          legacy.stopAccountDeletionSweep()
        },
        drain: legacy.drainJobAdmission,
      }
      return legacy.default as unknown as LegacyHandler
    },
    logger,
    readinessProbeTimeoutMs: config.readinessProbeTimeoutMs,
  })

  let benchmarkService: ReturnType<typeof createBenchmarkService> | undefined
  let closeBenchmark = async () => {}
  let benchmarkReady = !config.benchmark
  let benchmarkProbe = async () => {}
  if (config.benchmark) {
    const benchmarkMongo = createMongoAdapter(config.benchmark.mongodb)
    const benchmarkOss = createOssAdapter(config.benchmark.oss)
    try {
      await benchmarkMongo.connect()
      await Promise.all([benchmarkMongo.probe(), benchmarkOss.probe()])
      const benchmarkBucket = benchmarkOss.bucket(config.benchmark.oss.bucket)
      const verifyBenchmarkEvidence = async (key: string, expectedHash: string) => {
        const content = await benchmarkBucket.readFile(key, config.providerImageMaxBytes) as Buffer
        if (createHash('sha256').update(content).digest('hex') !== expectedHash) throw new Error('BENCHMARK_EVIDENCE_HASH_MISMATCH')
      }
      const readBenchmarkOperatorReport = async (key: string, maxBytes: number) => benchmarkBucket.readFile(key, maxBytes) as Promise<Uint8Array>
      const benchmarkRepository = createMongoBenchmarkRepository(benchmarkMongo.db, () => new Date(), verifyBenchmarkEvidence, config.benchmark.codeSha, readBenchmarkOperatorReport)
      await benchmarkRepository.ensureSuite()
      benchmarkService = createBenchmarkService({
        repository: benchmarkRepository,
        signEvidence: (key) => benchmarkBucket.getDownloadUrl(key, 15 * 60),
        verifyEvidence: verifyBenchmarkEvidence,
      })
      benchmarkReady = true
      benchmarkProbe = async () => { await Promise.all([benchmarkMongo.probe(), benchmarkOss.probe()]) }
      closeBenchmark = () => benchmarkMongo.close()
    } catch (error) {
      await benchmarkMongo.close().catch(() => {})
      await runtime.close().catch(() => {})
      throw error
    }
  }
  const closeAll = async () => {
    let failure: unknown
    try { await closeBenchmark() } catch (error) { failure = error }
    try { await runtime.close() } catch (error) { failure ||= error }
    if (failure) throw failure
  }
  const readinessProbe = async () => {
    const base = await runtime.readinessProbe()
    try { await benchmarkProbe(); benchmarkReady = true } catch { benchmarkReady = false }
    return { ...base, ready: base.ready && benchmarkReady, dependencies: { ...(base.dependencies || {}), benchmark: benchmarkReady ? 'ready' : 'unavailable' } }
  }
  const healthSnapshot = () => {
    const base = runtime.healthSnapshot()
    return { ...base, ready: base.ready && benchmarkReady, dependencies: { ...(base.dependencies || {}), benchmark: benchmarkReady ? 'ready' : 'unavailable' } }
  }

  const server = createServer({
    handler: runtime.handler,
    readinessProbe,
    healthSnapshot,
    config: { gatewayToken: config.gatewayToken, adminToken: config.adminToken, adminTransportToken: config.adminTransportToken, benchmarkDiscoveryToken: config.benchmarkDiscoveryToken, serviceName, version },
    logger,
    benchmarkService,
  })

  const shutdown = createGracefulShutdown({
    server,
    stopAdmission: legacyLifecycle.stop,
    drainJobs: legacyLifecycle.drain,
    closeRuntime: closeAll,
    logger,
    forceExit(code) { process.exit(code) },
  })
  const handleSignal = (signal: string) => {
    void shutdown(signal).catch((error) => {
      logger.error('graceful shutdown failed', error)
      process.exitCode = 1
    })
  }
  process.on('SIGTERM', handleSignal)
  process.on('SIGINT', handleSignal)

  await listenWithCleanup(server, config.port, config.host, closeAll)
  logger.info('service listening', { service: serviceName, host: config.host, port: config.port })
}

void main().catch((error) => {
  logger.error('startup failed', error)
  process.exitCode = 1
})
