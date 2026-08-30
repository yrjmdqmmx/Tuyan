import { appendFileSync } from 'node:fs'

export default class FakeScientificV2Oss {
  async put(key) {
    if (process.env.SCIENTIFIC_V2_DIST_OSS_AUDIT_PATH) appendFileSync(process.env.SCIENTIFIC_V2_DIST_OSS_AUDIT_PATH, `${key}\n`)
    return {}
  }
  async get() { throw new Error('unexpected duplicate object') }
}
