import { appendFileSync } from 'node:fs'

export default class FakeScientificV2Oss {
  constructor(config = {}) { this.endpoint = config.endpoint }
  async put(key) {
    if (process.env.SCIENTIFIC_V2_DIST_OSS_AUDIT_PATH) appendFileSync(process.env.SCIENTIFIC_V2_DIST_OSS_AUDIT_PATH, `${key}\n`)
    return {}
  }
  async get() { throw new Error('unexpected duplicate object') }
  async signatureUrlV4(_method, _expires, _request, key) {
    return `https://dist-private-bucket.oss-cn-hongkong.aliyuncs.com/${key}?x-oss-signature=dist-test`
  }
}
