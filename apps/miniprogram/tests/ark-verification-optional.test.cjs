const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')

const indexSource = readFileSync(join(__dirname, '../miniprogram/pages/index/index.ts'), 'utf8')
const refineSource = readFileSync(join(__dirname, '../miniprogram/pages/refine/refine.ts'), 'utf8')

assert.doesNotMatch(indexSource, /const hasArkVerification\s*=/u)
assert.doesNotMatch(indexSource, /hasArkVerification\s*&&/u)
assert.doesNotMatch(refineSource, /const hasArkVerification\s*=/u)
assert.doesNotMatch(refineSource, /hasArkVerification\s*&&/u)

console.log('ark-verification-optional.test.cjs passed')
