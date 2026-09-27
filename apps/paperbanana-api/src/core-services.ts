import type { MongoAdapter } from './mongo-adapter.js'
import type { OssAdapter } from './oss-adapter.js'

export let database: MongoAdapter['db']
export let objectStorage: Pick<OssAdapter, 'bucket'>

/** Bind the actual Node adapters before loading the business handler. */
export function configureCoreServices(adapters: { mongo: Pick<MongoAdapter, 'db'>; storage: Pick<OssAdapter, 'bucket'> }): void {
  database = adapters.mongo.db
  objectStorage = adapters.storage
}
