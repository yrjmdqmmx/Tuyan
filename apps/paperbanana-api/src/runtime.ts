import type { MongoAdapter } from './mongo-adapter.js'
import type { OssAdapter } from './oss-adapter.js'
import type { LegacyHandler, ReadinessProbe, ServiceLogger } from './server.js'

type RuntimeDependencies = {
  mongo: MongoAdapter
  oss: OssAdapter
  configureCloud(adapters: { mongo: MongoAdapter; storage: OssAdapter }): void
  loadHandler(): Promise<LegacyHandler>
  logger: ServiceLogger
}

export async function prepareRuntime({
  mongo,
  oss,
  configureCloud,
  loadHandler,
  logger,
}: RuntimeDependencies): Promise<{
  handler: LegacyHandler
  readinessProbe: ReadinessProbe
  close(): Promise<void>
}> {
  let handler: LegacyHandler
  try {
    await mongo.connect()
    const reconciledJobs = await mongo.reconcileInterruptedJobs()
    logger.info('startup reconciliation completed', { reconciledJobs })
    await mongo.probe()
    await oss.probe()
    configureCloud({ mongo, storage: oss })
    handler = await loadHandler()
  } catch (error) {
    await mongo.close()
    throw error
  }

  const readinessProbe: ReadinessProbe = async () => {
    const [mongodb, objectStorage] = await Promise.allSettled([mongo.probe(), oss.probe()])
    const dependencies = {
      mongodb: mongodb.status === 'fulfilled' ? 'ready' : 'unavailable',
      oss: objectStorage.status === 'fulfilled' ? 'ready' : 'unavailable',
    }
    return {
      ready: dependencies.mongodb === 'ready' && dependencies.oss === 'ready',
      dependencies,
    }
  }

  return {
    handler,
    readinessProbe,
    async close() {
      await mongo.close()
    },
  }
}
