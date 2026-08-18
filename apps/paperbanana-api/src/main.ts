import path from 'node:path'

import { loadConfig } from './config.js'
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
  const config = loadConfig()
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
      legacyLifecycle = {
        stop: legacy.stopJobAdmission,
        drain: legacy.drainJobAdmission,
      }
      return legacy.default as unknown as LegacyHandler
    },
    logger,
    readinessProbeTimeoutMs: config.readinessProbeTimeoutMs,
  })

  const server = createServer({
    handler: runtime.handler,
    readinessProbe: runtime.readinessProbe,
    healthSnapshot: runtime.healthSnapshot,
    config: { gatewayToken: config.gatewayToken, adminToken: config.adminToken, serviceName, version },
    logger,
  })

  const shutdown = createGracefulShutdown({
    server,
    stopAdmission: legacyLifecycle.stop,
    drainJobs: legacyLifecycle.drain,
    closeRuntime: runtime.close,
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

  await listenWithCleanup(server, config.port, config.host, runtime.close)
  logger.info('service listening', { service: serviceName, host: config.host, port: config.port })
}

void main().catch((error) => {
  logger.error('startup failed', error)
  process.exitCode = 1
})
