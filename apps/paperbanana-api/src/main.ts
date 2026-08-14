import path from 'node:path'

import { loadConfig } from './config.js'
import { configureLafCloud } from './laf-cloud.js'
import { listenWithCleanup } from './listen.js'
import { createLogger } from './logger.js'
import { createMongoAdapter } from './mongo-adapter.js'
import { createOssAdapter } from './oss-adapter.js'
import { prepareRuntime } from './runtime.js'
import { createServer, type LegacyHandler } from './server.js'

const serviceName = 'paperbanana-api'
const version = '0.1.0'
const logger = createLogger()

async function main(): Promise<void> {
  const config = loadConfig()
  process.env.RESVG_WASM_PATH ||= path.join(process.cwd(), 'node_modules/@resvg/resvg-wasm/index_bg.wasm')

  const mongo = createMongoAdapter(config.mongodb)
  const oss = createOssAdapter(config.oss)
  const runtime = await prepareRuntime({
    mongo,
    oss,
    configureCloud: configureLafCloud,
    async loadHandler() {
      const legacy = await import('./legacy-entry.mjs')
      return legacy.default as unknown as LegacyHandler
    },
    logger,
  })

  const server = createServer({
    handler: runtime.handler,
    readinessProbe: runtime.readinessProbe,
    config: { gatewayToken: config.gatewayToken, adminToken: config.adminToken, serviceName, version },
    logger,
  })

  const shutdown = async (signal: string) => {
    logger.info('shutdown requested', { signal })
    await new Promise<void>((resolve) => server.close(() => resolve()))
    await runtime.close()
  }
  process.once('SIGTERM', () => void shutdown('SIGTERM'))
  process.once('SIGINT', () => void shutdown('SIGINT'))

  await listenWithCleanup(server, config.port, config.host, runtime.close)
  logger.info('service listening', { service: serviceName, host: config.host, port: config.port })
}

void main().catch((error) => {
  logger.error('startup failed', error)
  process.exitCode = 1
})
